// Core domain models used across carrier integrations.
import { z } from "zod";

export const CarrierSchema = z.enum(["UPS", "FEDEX", "DHL", "USPS"]);
export type Carrier = z.infer<typeof CarrierSchema>;

export const ServiceLevelSchema = z.enum([
  "GROUND",
  "THREE_DAY_SELECT",
  "SECOND_DAY_AIR",
  "NEXT_DAY_AIR",
  "UNKNOWN"
]);
export type ServiceLevel = z.infer<typeof ServiceLevelSchema>;

export const AddressSchema = z.object({
  name: z.string().min(1),
  addressLine1: z.string().min(1),
  addressLine2: z.string().optional(),
  city: z.string().min(1),
  stateProvince: z.string().min(1),
  postalCode: z.string().min(1),
  countryCode: z.string().length(2).toUpperCase()
});
export type Address = z.infer<typeof AddressSchema>;

export const WeightSchema = z.object({
  value: z.number().positive(),
  unit: z.enum(["LB", "KG"])
});
export type Weight = z.infer<typeof WeightSchema>;

export const DimensionsSchema = z.object({
  length: z.number().positive(),
  width: z.number().positive(),
  height: z.number().positive(),
  unit: z.enum(["IN", "CM"])
});
export type Dimensions = z.infer<typeof DimensionsSchema>;

export const PackageSchema = z.object({
  packagingType: z.enum(["CUSTOM", "UPS_LETTER", "UPS_PAK"]).default("CUSTOM"),
  weight: WeightSchema,
  dimensions: DimensionsSchema.optional()
});
export type Package = z.infer<typeof PackageSchema>;

export const RateRequestSchema = z.object({
  shipperAddress: AddressSchema,
  shipToAddress: AddressSchema,
  packages: z.array(PackageSchema).min(1),
  shipmentDate: z.string().datetime().optional(),
  pickupType: z.enum(["DAILY_PICKUP", "CUSTOMER_COUNTER"]).default("DAILY_PICKUP"),
  customerClassification: z.enum(["WHOLESALE", "OCCASIONAL"]).default("OCCASIONAL")
});
export type RateRequest = z.infer<typeof RateRequestSchema>;

export const MoneySchema = z.object({
  amount: z.number().nonnegative(),
  currency: z.string().length(3).toUpperCase()
});
export type Money = z.infer<typeof MoneySchema>;

export const RateQuoteSchema = z.object({
  carrier: CarrierSchema,
  serviceLevel: ServiceLevelSchema,
  serviceCode: z.string(),
  totalCharge: MoneySchema,
  estimatedDeliveryDays: z.number().int().positive().optional(),
  rawCarrierPayload: z.unknown().optional()
});
export type RateQuote = z.infer<typeof RateQuoteSchema>;
