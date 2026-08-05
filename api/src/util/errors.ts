export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly clientMessage: string;

  constructor(message: string, statusCode = 500, clientMessage?: string) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.clientMessage = clientMessage ?? message;
  }

  errors(): string[] {
    return [this.clientMessage];
  }

  static badRequest(message: string): ApiError {
    return new ApiError(message, 400, message);
  }

  static notFound(resource: string): ApiError {
    return new ApiError(`${resource} not found`, 404, `${resource} not found`);
  }

  static unauthorized(message = 'unauthorized'): ApiError {
    return new ApiError(message, 401, message);
  }

  static tooManyRequests(message: string): ApiError {
    return new ApiError(message, 429, message);
  }

  static internal(message: string): ApiError {
    return new ApiError(message, 500, 'internal server error');
  }
}

export function isApiError(err: unknown): err is ApiError {
  return err instanceof ApiError;
}
