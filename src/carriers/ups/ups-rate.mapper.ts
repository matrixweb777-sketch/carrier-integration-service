import { z } from "zod";
import type { RateQuote, RateRequest, ServiceLevel } from "../../domain/models";
import { RateQuoteSchema } from "../../domain/models";
import { ExternalApiError } from "../../errors";

const UpsRateResponseSchema = z.object({
  RateResponse: z.object({
    Response: z.object({
      ResponseStatus: z.object({
        Code: z.string()
      })
    }),
    RatedShipment: z.union([
      z.array(
        z.object({
          Service: z.object({ Code: z.string() }),
          TotalCharges: z.object({
            CurrencyCode: z.string(),
            MonetaryValue: z.string()
          }),
          GuaranteedDelivery: z.object({
            BusinessDaysInTransit: z.string().optional()
          }).optional()
        })
      ),
      z.object({
        Service: z.object({ Code: z.string() }),
        TotalCharges: z.object({
          CurrencyCode: z.string(),
          MonetaryValue: z.string()
        }),
        GuaranteedDelivery: z.object({
          BusinessDaysInTransit: z.string().optional()
        }).optional()
      })
    ])
  })
});

const serviceCodeMap: Record<string, ServiceLevel> = {
  "03": "GROUND",
  "12": "THREE_DAY_SELECT",
  "02": "SECOND_DAY_AIR",
  "01": "NEXT_DAY_AIR"
};

function mapServiceLevel(serviceCode: string): ServiceLevel {
  return serviceCodeMap[serviceCode] ?? "UNKNOWN";
}

export function mapRateRequestToUpsPayload(rateRequest: RateRequest): unknown {
  return {
    RateRequest: {
      Request: {
        RequestOption: "Shop",
        TransactionReference: {
          CustomerContext: "CarrierIntegrationService"
        }
      },
      Shipment: {
        Shipper: {
          Name: rateRequest.shipperAddress.name,
          Address: {
            AddressLine: [rateRequest.shipperAddress.addressLine1, rateRequest.shipperAddress.addressLine2].filter(Boolean),
            City: rateRequest.shipperAddress.city,
            StateProvinceCode: rateRequest.shipperAddress.stateProvince,
            PostalCode: rateRequest.shipperAddress.postalCode,
            CountryCode: rateRequest.shipperAddress.countryCode
          }
        },
        ShipTo: {
          Name: rateRequest.shipToAddress.name,
          Address: {
            AddressLine: [rateRequest.shipToAddress.addressLine1, rateRequest.shipToAddress.addressLine2].filter(Boolean),
            City: rateRequest.shipToAddress.city,
            StateProvinceCode: rateRequest.shipToAddress.stateProvince,
            PostalCode: rateRequest.shipToAddress.postalCode,
            CountryCode: rateRequest.shipToAddress.countryCode
          }
        },
        Package: rateRequest.packages.map((pkg) => ({
          PackagingType: {
            Code: pkg.packagingType === "CUSTOM" ? "02" : "01"
          },
          PackageWeight: {
            UnitOfMeasurement: {
              Code: pkg.weight.unit
            },
            Weight: pkg.weight.value.toString()
          },
          Dimensions: pkg.dimensions
            ? {
                UnitOfMeasurement: { Code: pkg.dimensions.unit },
                Length: pkg.dimensions.length.toString(),
                Width: pkg.dimensions.width.toString(),
                Height: pkg.dimensions.height.toString()
              }
            : undefined
        }))
      }
    }
  };
}

export function mapUpsRateResponseToQuotes(responseData: unknown): RateQuote[] {
  const parsed = UpsRateResponseSchema.safeParse(responseData);
  if (!parsed.success) {
    throw new ExternalApiError("Malformed UPS rate response", {
      issues: parsed.error.issues
    });
  }

  const ratedShipments = Array.isArray(parsed.data.RateResponse.RatedShipment)
    ? parsed.data.RateResponse.RatedShipment
    : [parsed.data.RateResponse.RatedShipment];

  const normalizedQuotes: RateQuote[] = ratedShipments.map((ratedShipment) => ({
    carrier: "UPS",
    serviceLevel: mapServiceLevel(ratedShipment.Service.Code),
    serviceCode: ratedShipment.Service.Code,
    totalCharge: {
      amount: Number(ratedShipment.TotalCharges.MonetaryValue),
      currency: ratedShipment.TotalCharges.CurrencyCode
    },
    estimatedDeliveryDays: ratedShipment.GuaranteedDelivery?.BusinessDaysInTransit
      ? Number(ratedShipment.GuaranteedDelivery.BusinessDaysInTransit)
      : undefined,
    rawCarrierPayload: ratedShipment
  }));

  const validatedQuotes = z.array(RateQuoteSchema).safeParse(normalizedQuotes);
  if (!validatedQuotes.success) {
    throw new ExternalApiError("UPS response could not be normalized into domain models", {
      issues: validatedQuotes.error.issues
    });
  }

  return validatedQuotes.data;
}
