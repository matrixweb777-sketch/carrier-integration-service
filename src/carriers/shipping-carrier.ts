import type { RateQuote, RateRequest } from "../domain/models";

export interface CreateShipmentRequest {
 // Not implemented yet — added for interface completeness.
  // Will be used when shipment creation is added.
  readonly notImplementedYet?: true;
}

export interface TrackShipmentRequest {
  // Not implemented yet — keeping the contract ready for tracking support later.
  readonly notImplementedYet?: true;
}

export interface CarrierAdapter {
  getRates(rateRequest: RateRequest): Promise<RateQuote[]>;
  createShipment(request: CreateShipmentRequest): Promise<unknown>;
  trackShipment(request: TrackShipmentRequest): Promise<unknown>;
}
