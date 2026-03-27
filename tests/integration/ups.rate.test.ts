import { describe, expect, it } from "vitest";
import { TokenManager } from "../../src/auth/token-manager";
import { UpsCarrierAdapter } from "../../src/carriers/ups/ups.gateway";
import type { RateRequest } from "../../src/domain/models";
import { StubHttpClient } from "./test-utils";

function buildRateRequest(): RateRequest {
  return {
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
        weight: { value: 5, unit: "LB" },
        dimensions: { length: 12, width: 8, height: 6, unit: "IN" }
      }
    ],
    pickupType: "DAILY_PICKUP",
    customerClassification: "OCCASIONAL"
  };
}

describe("UPS rate integration", () => {
  it("maps domain request into UPS payload", async () => {
    const httpClient = new StubHttpClient();
    const tokenManager = new TokenManager(httpClient, {
      authUrl: "https://ups.example.com/oauth/token",
      clientId: "client",
      clientSecret: "secret",
      timeoutMs: 1000
    });
    const carrier = new UpsCarrierAdapter(httpClient, tokenManager, {
      baseUrl: "https://ups.example.com",
      timeoutMs: 1000
    });

    httpClient.enqueueResponse({
      status: 200,
      headers: {},
      data: { access_token: "token-123", token_type: "Bearer", expires_in: 3600 }
    });
    httpClient.enqueueResponse({
      status: 200,
      headers: {},
      data: {
        RateResponse: {
          Response: { ResponseStatus: { Code: "1" } },
          RatedShipment: {
            Service: { Code: "03" },
            TotalCharges: { CurrencyCode: "USD", MonetaryValue: "12.34" },
            GuaranteedDelivery: { BusinessDaysInTransit: "3" }
          }
        }
      }
    });

    await carrier.getRates(buildRateRequest());

    expect(httpClient.requests).toHaveLength(2);
    const rateRequest = httpClient.requests[1];
    expect(rateRequest.url).toContain("/api/rating/v1/Shop");
    expect(rateRequest.headers?.Authorization).toBe("Bearer token-123");
    expect(rateRequest.data).toEqual({
      RateRequest: {
        Request: {
          RequestOption: "Shop",
          TransactionReference: { CustomerContext: "CarrierIntegrationService" }
        },
        Shipment: {
          Shipper: {
            Name: "Warehouse A",
            Address: {
              AddressLine: ["123 Main St"],
              City: "Atlanta",
              StateProvinceCode: "GA",
              PostalCode: "30301",
              CountryCode: "US"
            }
          },
          ShipTo: {
            Name: "Customer B",
            Address: {
              AddressLine: ["500 Market St"],
              City: "San Francisco",
              StateProvinceCode: "CA",
              PostalCode: "94105",
              CountryCode: "US"
            }
          },
          Package: [
            {
              PackagingType: { Code: "02" },
              PackageWeight: {
                UnitOfMeasurement: { Code: "LB" },
                Weight: "5"
              },
              Dimensions: {
                UnitOfMeasurement: { Code: "IN" },
                Length: "12",
                Width: "8",
                Height: "6"
              }
            }
          ]
        }
      }
    });
  });

  it("normalizes UPS response into internal rate quotes", async () => {
    const httpClient = new StubHttpClient();
    const tokenManager = new TokenManager(httpClient, {
      authUrl: "https://ups.example.com/oauth/token",
      clientId: "client",
      clientSecret: "secret",
      timeoutMs: 1000
    });
    const carrier = new UpsCarrierAdapter(httpClient, tokenManager, {
      baseUrl: "https://ups.example.com",
      timeoutMs: 1000
    });

    httpClient.enqueueResponse({
      status: 200,
      headers: {},
      data: { access_token: "token-123", token_type: "Bearer", expires_in: 3600 }
    });
    httpClient.enqueueResponse({
      status: 200,
      headers: {},
      data: {
        RateResponse: {
          Response: { ResponseStatus: { Code: "1" } },
          RatedShipment: [
            {
              Service: { Code: "03" },
              TotalCharges: { CurrencyCode: "USD", MonetaryValue: "14.50" },
              GuaranteedDelivery: { BusinessDaysInTransit: "4" }
            },
            {
              Service: { Code: "01" },
              TotalCharges: { CurrencyCode: "USD", MonetaryValue: "32.99" }
            }
          ]
        }
      }
    });

    const quotes = await carrier.getRates(buildRateRequest());

    expect(quotes).toEqual([
      {
        carrier: "UPS",
        serviceLevel: "GROUND",
        serviceCode: "03",
        totalCharge: { amount: 14.5, currency: "USD" },
        estimatedDeliveryDays: 4,
        rawCarrierPayload: {
          Service: { Code: "03" },
          TotalCharges: { CurrencyCode: "USD", MonetaryValue: "14.50" },
          GuaranteedDelivery: { BusinessDaysInTransit: "4" }
        }
      },
      {
        carrier: "UPS",
        serviceLevel: "NEXT_DAY_AIR",
        serviceCode: "01",
        totalCharge: { amount: 32.99, currency: "USD" },
        estimatedDeliveryDays: undefined,
        rawCarrierPayload: {
          Service: { Code: "01" },
          TotalCharges: { CurrencyCode: "USD", MonetaryValue: "32.99" }
        }
      }
    ]);
  });
});
