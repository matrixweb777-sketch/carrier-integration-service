import { describe, expect, it } from "vitest";
import { TokenManager } from "../../src/auth/token-manager";
import { UpsCarrierAdapter } from "../../src/carriers/ups/ups.gateway";
import {
  ExternalApiError,
  NetworkError,
  RateLimitError
} from "../../src/errors";
import type { RateRequest } from "../../src/domain/models";
import { StubHttpClient } from "./test-utils";

const request: RateRequest = {
  shipperAddress: {
    name: "Warehouse A",
    addressLine1: "123 Main St",
    city: "Atlanta",
    stateProvince: "GA",
    postalCode: "30301",
    countryCode: "US"
  },
  shipToAddress: {
    name: "Customer B",
    addressLine1: "500 Market St",
    city: "San Francisco",
    stateProvince: "CA",
    postalCode: "94105",
    countryCode: "US"
  },
  packages: [
    {
      packagingType: "CUSTOM",
      weight: { value: 5, unit: "LB" }
    }
  ],
  pickupType: "DAILY_PICKUP",
  customerClassification: "OCCASIONAL"
};

function buildSubject(httpClient: StubHttpClient): UpsCarrierAdapter {
  const tokenManager = new TokenManager(httpClient, {
    authUrl: "https://ups.example.com/oauth/token",
    clientId: "client",
    clientSecret: "secret",
    timeoutMs: 1000
  });

  return new UpsCarrierAdapter(httpClient, tokenManager, {
    baseUrl: "https://ups.example.com",
    timeoutMs: 1000
  });
}

describe("UPS error handling", () => {
  it("throws ExternalApiError on 400", async () => {
    const httpClient = new StubHttpClient();
    const carrier = buildSubject(httpClient);
    httpClient.enqueueResponse({
      status: 200,
      headers: {},
      data: { access_token: "token", token_type: "Bearer", expires_in: 3600 }
    });
    httpClient.enqueueResponse({
      status: 400,
      headers: {},
      data: { response: { errors: [{ code: "110002", message: "Bad request" }] } }
    });

    await expect(carrier.getRates(request)).rejects.toBeInstanceOf(ExternalApiError);
  });

  it("throws ExternalApiError on 500", async () => {
    const httpClient = new StubHttpClient();
    const carrier = buildSubject(httpClient);
    httpClient.enqueueResponse({
      status: 200,
      headers: {},
      data: { access_token: "token", token_type: "Bearer", expires_in: 3600 }
    });
    httpClient.enqueueResponse({
      status: 500,
      headers: {},
      data: { response: { errors: [{ code: "999999", message: "Internal server error" }] } }
    });

    await expect(carrier.getRates(request)).rejects.toBeInstanceOf(ExternalApiError);
  });

  it("throws RateLimitError on 429", async () => {
    const httpClient = new StubHttpClient();
    const carrier = buildSubject(httpClient);
    httpClient.enqueueResponse({
      status: 200,
      headers: {},
      data: { access_token: "token", token_type: "Bearer", expires_in: 3600 }
    });
    httpClient.enqueueResponse({
      status: 429,
      headers: { "retry-after": "1" },
      data: { response: { errors: [{ code: "RATE_LIMIT", message: "Too many requests" }] } }
    });

    await expect(carrier.getRates(request)).rejects.toBeInstanceOf(RateLimitError);
  });

  it("throws ExternalApiError for malformed response", async () => {
    const httpClient = new StubHttpClient();
    const carrier = buildSubject(httpClient);
    httpClient.enqueueResponse({
      status: 200,
      headers: {},
      data: { access_token: "token", token_type: "Bearer", expires_in: 3600 }
    });
    httpClient.enqueueResponse({
      status: 200,
      headers: {},
      data: { invalid: "json-shape" }
    });

    await expect(carrier.getRates(request)).rejects.toBeInstanceOf(ExternalApiError);
  });

  it("throws NetworkError for request timeout", async () => {
    const httpClient = new StubHttpClient();
    const carrier = buildSubject(httpClient);
    httpClient.enqueueResponse({
      status: 200,
      headers: {},
      data: { access_token: "token", token_type: "Bearer", expires_in: 3600 }
    });
    httpClient.enqueueError(new Error("ETIMEDOUT"));

    await expect(carrier.getRates(request)).rejects.toBeInstanceOf(NetworkError);
  });
});
