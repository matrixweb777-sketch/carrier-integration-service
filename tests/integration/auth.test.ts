import { describe, expect, it } from "vitest";
import { TokenManager } from "../../src/auth/token-manager";
import { StubHttpClient } from "./test-utils";

describe("Token lifecycle", () => {
  it("acquires and reuses token until expiry", async () => {
    let nowMs = 0;
    const now = () => nowMs;

    const httpClient = new StubHttpClient();
    const tokenManager = new TokenManager(httpClient, {
      authUrl: "https://ups.example.com/oauth/token",
      clientId: "client",
      clientSecret: "secret",
      timeoutMs: 1000
    }, now);

    httpClient.enqueueResponse({
      status: 200,
      headers: {},
      data: { access_token: "token-a", token_type: "Bearer", expires_in: 120 }
    });

    const token1 = await tokenManager.getAccessToken();
    const token2 = await tokenManager.getAccessToken();

    expect(token1).toBe("token-a");
    expect(token2).toBe("token-a");
    expect(httpClient.requests).toHaveLength(1);
  });

  it("refreshes token after expiry", async () => {
    let nowMs = 0;
    const now = () => nowMs;

    const httpClient = new StubHttpClient();
    const tokenManager = new TokenManager(httpClient, {
      authUrl: "https://ups.example.com/oauth/token",
      clientId: "client",
      clientSecret: "secret",
      timeoutMs: 1000
    }, now);

    httpClient.enqueueResponse({
      status: 200,
      headers: {},
      data: { access_token: "token-a", token_type: "Bearer", expires_in: 31 }
    });
    httpClient.enqueueResponse({
      status: 200,
      headers: {},
      data: { access_token: "token-b", token_type: "Bearer", expires_in: 3600 }
    });

    const first = await tokenManager.getAccessToken();
    nowMs = 2000;
    const refreshed = await tokenManager.getAccessToken();

    expect(first).toBe("token-a");
    expect(refreshed).toBe("token-b");
    expect(httpClient.requests).toHaveLength(2);
  });
});
