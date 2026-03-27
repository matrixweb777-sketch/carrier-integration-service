# Carrier Integration Service – UPS Implementation

Production-grade TypeScript backend service that integrates with UPS Rating APIs using a clean architecture and adapter pattern.  
The implementation is designed to hide carrier-specific details and support future carrier and operation expansion.

## Architecture Decisions

- **Domain layer first**: internal models are validated with Zod before crossing any external boundary.
- **Carrier abstraction**: `CarrierAdapter` provides stable operations (`getRates`, `createShipment`, `trackShipment`) while each carrier handles API-specific details.
- **UPS adapter isolation**: request mapping and response normalization are isolated in `ups.mapper.ts`, keeping service logic clean.
- **Auth transparency**: `TokenManager` handles OAuth client credentials, in-memory token caching, refresh, and retry behavior without leaking complexity to callers.
- **HTTP abstraction**: `HttpClient` decouples business logic from HTTP library choice (`AxiosHttpClient` today, swappable tomorrow).
- **Structured errors**: typed error hierarchy provides machine-readable failures for upstream services.

## Project Structure

```text
src/
  auth/
  carriers/
    ups/
  config/
  domain/
  errors/
  infrastructure/
    http/
    logging/
  services/
tests/
  integration/
```

## Configuration

All runtime config is loaded from environment variables:

- `UPS_CLIENT_ID`
- `UPS_CLIENT_SECRET`
- `UPS_BASE_URL`
- `UPS_AUTH_URL`
- `REQUEST_TIMEOUT`

Copy `.env.example` into `.env` and fill values.

## Run Locally

```bash
npm install
npm run typecheck
npm run test
npm run build
```

## Test Strategy

Integration tests stub the HTTP layer and use realistic UPS-style payloads.  
No real UPS API calls are executed.

Implemented tests:

- `tests/integration/ups.rate.test.ts`
  - domain request -> UPS payload mapping
  - UPS response -> normalized internal `RateQuote[]`
- `tests/integration/auth.test.ts`
  - token acquisition
  - token reuse
  - token refresh on expiry
- `tests/integration/error-handling.test.ts`
  - 400 client errors
  - 500 server errors
  - 429 rate limiting
  - malformed response shape
  - timeout/network failure simulation

## How To Add Another Carrier

1. Create a new adapter implementing `CarrierAdapter` (for example `FedExCarrierAdapter`).
2. Add carrier-specific mapper files to translate internal domain models <-> external payloads.
3. Reuse `TokenManager` if the carrier supports OAuth client credentials, or implement carrier-specific auth strategy.
4. Add integration tests with stubbed HTTP responses for payload mapping, normalization, and error handling.
5. Wire the new adapter into service composition.

### Why I designed it this way
- I focused on keeping carrier integrations isolated, so adding FedEx or DHL later would be simple.
- This architecture follows the Strategy Pattern, ensuring the main application logic remains independent of specific carrier API changes.

## What I Would Improve With More Time

- Add retry/backoff and circuit breaker strategy for transient upstream failures.
- Add richer observability (request IDs, metrics, tracing).
- Add contract tests with frozen UPS sample fixtures.
- Add idempotency and persistence patterns for shipment creation.
- Add multi-carrier orchestration service for simultaneous rate shopping.
