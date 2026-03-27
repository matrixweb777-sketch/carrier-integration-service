import { z } from "zod";
import type { HttpClient } from "../infrastructure/http/http-client";
import { AuthenticationError } from "../errors";

export interface TokenManagerConfig {
  authUrl: string;
  clientId: string;
  clientSecret: string;
  timeoutMs: number;
}

interface CachedToken {
  accessToken: string;
  expiresAtMs: number;
}

const OAuthTokenResponseSchema = z.object({
  access_token: z.string().min(1),
  token_type: z.string().min(1),
  expires_in: z.coerce.number().int().positive()
});

export class TokenManager {
  private cachedToken?: CachedToken;
  private inflightRefresh?: Promise<string>;

  constructor(
    private readonly httpClient: HttpClient,
    private readonly config: TokenManagerConfig,
    private readonly now: () => number = () => Date.now()
  ) {}

  async getAccessToken(forceRefresh = false): Promise<string> {
    if (!forceRefresh && this.cachedToken && this.cachedToken.expiresAtMs > this.now()) {
      return this.cachedToken.accessToken;
    }

    if (!this.inflightRefresh) {
      this.inflightRefresh = this.fetchToken().finally(() => {
        this.inflightRefresh = undefined;
      });
    }

    return this.inflightRefresh;
  }

  private async fetchToken(): Promise<string> {
    const basicAuth = Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString("base64");

    const response = await this.httpClient.request({
      method: "POST",
      url: this.config.authUrl,
      timeoutMs: this.config.timeoutMs,
      headers: {
        Authorization: `Basic ${basicAuth}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      data: "grant_type=client_credentials"
    });

    if (response.status < 200 || response.status >= 300) {
      throw new AuthenticationError("Failed to fetch OAuth token from carrier", {
        status: response.status,
        response: response.data
      });
    }

    const parsed = OAuthTokenResponseSchema.safeParse(response.data);
    if (!parsed.success) {
      throw new AuthenticationError("Carrier auth response format is invalid", {
        issues: parsed.error.issues
      });
    }

    // 30-second safety margin to avoid edge-expiry race in high traffic paths.
    const expiresAtMs = this.now() + Math.max(1, parsed.data.expires_in - 30) * 1000;
    this.cachedToken = {
      accessToken: parsed.data.access_token,
      expiresAtMs
    };

    return parsed.data.access_token;
  }
}
