import { ErrorCode, ErrorCodeStatusMap } from '@src/errors/errorTypes';
import { ApiResponse } from '@src/responses/apiResponse';

export class AppError extends Error {
  code: ErrorCode;
  statusCode: number;
  details?: any;

  constructor(
    message: string,
    code: ErrorCode = ErrorCode.UNKNOWN_ERROR,
    statusCode?: number,
    details?: any,
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;

    // If status code is not specified, get it from the mapping
    this.statusCode = statusCode || ErrorCodeStatusMap[code];
    this.details = details;

    Error.captureStackTrace(this, this.constructor);
  }

  // Format response according to ApiResponse interface
  toResponse(): ApiResponse {
    const errorDetails =
      process.env.NODE_ENV === 'development'
        ? { code: this.code, details: this.details, stack: this.stack }
        : { code: this.code };

    return {
      status: this.statusCode,
      message: this.message,
      error: errorDetails,
    };
  }
}
