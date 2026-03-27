import type { CarrierAdapter } from "../carriers/shipping-carrier";
import type { RateQuote, RateRequest } from "../domain/models";

export class RateShoppingService {
  constructor(private readonly carrierAdapter: CarrierAdapter) {}

  async shopRates(request: RateRequest): Promise<RateQuote[]> {
    return this.carrierAdapter.getRates(request);
  }
}
