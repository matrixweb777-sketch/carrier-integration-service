import { loadConfig } from "./config/env";
import { AxiosHttpClient } from "./infrastructure/http/axios-http-client";
import { TokenManager } from "./auth/token-manager";
import { UpsCarrierAdapter } from "./carriers/ups/ups.gateway";
import { RateShoppingService } from "./services/rate-shopping.service";

export function createRateShoppingService(): RateShoppingService {
  const config = loadConfig();
  const httpClient = new AxiosHttpClient();
  const tokenManager = new TokenManager(httpClient, {
    authUrl: config.UPS_AUTH_URL,
    clientId: config.UPS_CLIENT_ID,
    clientSecret: config.UPS_CLIENT_SECRET,
    timeoutMs: config.REQUEST_TIMEOUT
  });

  const upsAdapter = new UpsCarrierAdapter(httpClient, tokenManager, {
    baseUrl: config.UPS_BASE_URL,
    timeoutMs: config.REQUEST_TIMEOUT
  });

  return new RateShoppingService(upsAdapter);
}

export * from "./domain/models";
export * from "./errors";
export * from "./auth/token-manager";
export * from "./carriers/shipping-carrier";
export * from "./carriers/ups/ups.gateway";
export * from "./services/rate-shopping.service";
