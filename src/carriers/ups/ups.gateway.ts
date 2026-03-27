// UPS carrier implementation.
// Keeps UPS-specific logic isolated from the core domain.
import type { CarrierAdapter, CreateShipmentRequest, TrackShipmentRequest } from "../shipping-carrier";
import type { RateQuote, RateRequest } from "../../domain/models";
import { RateRequestSchema } from "../../domain/models";
import type { HttpClient } from "../../infrastructure/http/http-client";
import type { TokenManager } from "../../auth/token-manager";
import {
  CarrierError,
  ExternalApiError,
  NetworkError,
  RateLimitError,
  ValidationError
} from "../../errors";
import { mapRateRequestToUpsPayload, mapUpsRateResponseToQuotes } from "./ups-rate.mapper";

export interface UpsCarrierConfig {
  baseUrl: string;
  timeoutMs: number;
}
/**
 * UPS carrier implementation.
 * This adapter isolates UPS API specifics from the core domain models,
 * making it easier to add additional carriers in the future.
 */

export class UpsCarrierAdapter implements CarrierAdapter {
  constructor(
    private readonly httpClient: HttpClient,
    private readonly tokenManager: TokenManager,
    private readonly config: UpsCarrierConfig
  ) {}
// Maps internal rate request into UPS payload and normalizes the response.
  async getRates(rateRequest: RateRequest): Promise<RateQuote[]> {
    const validation = RateRequestSchema.safeParse(rateRequest);
    if (!validation.success) {
      throw new ValidationError("Rate request is invalid", {
        issues: validation.error.issues
      });
    }

    const payload = mapRateRequestToUpsPayload(validation.data);
    return this.fetchRatesWithRetry(payload);
  }

  async createShipment(_request: CreateShipmentRequest): Promise<unknown> {
    throw new CarrierError("UPS createShipment is not implemented yet");
  }

  async trackShipment(_request: TrackShipmentRequest): Promise<unknown> {
    throw new CarrierError("UPS trackShipment is not implemented yet");
  }

  private async fetchRatesWithRetry(payload: unknown): Promise<RateQuote[]> {
    try {
      return await this.fetchRates(payload, false);
    } catch (error) {
      if (error instanceof ExternalApiError && error.details?.status === 401) {
        return this.fetchRates(payload, true);
      }
      throw error;
    }
  }

  private async fetchRates(payload: unknown, forceRefreshToken: boolean): Promise<RateQuote[]> {
    const token = await this.tokenManager.getAccessToken(forceRefreshToken);

    try {
      const response = await this.httpClient.request({
        method: "POST",
        url: `${this.config.baseUrl}/api/rating/v1/Shop`,
        timeoutMs: this.config.timeoutMs,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        data: payload
      });

      if (response.status === 429) {
        throw new RateLimitError("UPS API rate limit reached", { status: response.status, response: response.data });
      }

      if (response.status >= 500) {
        throw new ExternalApiError("UPS API server error", { status: response.status, response: response.data });
      }

      if (response.status >= 400) {
        throw new ExternalApiError("UPS API returned client error", { status: response.status, response: response.data });
      }

      return mapUpsRateResponseToQuotes(response.data);
    } catch (error) {
      if (error instanceof RateLimitError || error instanceof ExternalApiError) {
        throw error;
      }

      if (error instanceof Error) {
        throw new NetworkError("Failed to communicate with UPS API", { message: error.message }, error);
      }

      throw new NetworkError("Unknown network error while calling UPS API", undefined, error);
    }
  }
}
