import { AppError } from '@src/errors/baseErrors';
import { ErrorCode } from '@src/errors/errorTypes';

export class BadRequestError extends AppError {
  constructor(message = 'Bad request', details?: any) {
    super(message, ErrorCode.BAD_REQUEST, 400, details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized', details?: any) {
    super(message, ErrorCode.UNAUTHORIZED, 401, details);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden', details?: any) {
    super(message, ErrorCode.FORBIDDEN, 403, details);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Not found', details?: any) {
    super(message, ErrorCode.NOT_FOUND, 404, details);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Conflict', details?: any) {
    super(message, ErrorCode.CONFLICT, 409, details);
  }
}

export class InternalServerError extends AppError {
  constructor(message = 'Internal server error', details?: any) {
    super(message, ErrorCode.INTERNAL_SERVER, 500, details);
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Validation failed', details?: any) {
    super(message, ErrorCode.VALIDATION_ERROR, 422, details);
  }
}

export class DatabaseError extends AppError {
  constructor(message = 'Database error', details?: any) {
    super(message, ErrorCode.DATABASE_ERROR, 500, details);
  }
}