export type ErrorDetails = Record<string, unknown>;

export class CarrierServiceError extends Error {
  public readonly code: string;
  public readonly details?: ErrorDetails;
  public readonly cause?: unknown;

  constructor(message: string, code: string, details?: ErrorDetails, cause?: unknown) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.details = details;
    this.cause = cause;
  }
}

export class CarrierError extends CarrierServiceError {
  constructor(message: string, details?: ErrorDetails, cause?: unknown) {
    super(message, "CARRIER_ERROR", details, cause);
  }
}

export class AuthenticationError extends CarrierServiceError {
  constructor(message: string, details?: ErrorDetails, cause?: unknown) {
    super(message, "AUTHENTICATION_ERROR", details, cause);
  }
}

export class RateLimitError extends CarrierServiceError {
  constructor(message: string, details?: ErrorDetails, cause?: unknown) {
    super(message, "RATE_LIMIT_ERROR", details, cause);
  }
}

export class NetworkError extends CarrierServiceError {
  constructor(message: string, details?: ErrorDetails, cause?: unknown) {
    super(message, "NETWORK_ERROR", details, cause);
  }
}

export class ValidationError extends CarrierServiceError {
  constructor(message: string, details?: ErrorDetails, cause?: unknown) {
    super(message, "VALIDATION_ERROR", details, cause);
  }
}

export class ExternalApiError extends CarrierServiceError {
  constructor(message: string, details?: ErrorDetails, cause?: unknown) {
    super(message, "EXTERNAL_API_ERROR", details, cause);
  }
}
