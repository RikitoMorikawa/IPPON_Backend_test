import { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';
import { AppError } from '@src/errors/baseErrors';
import { ValidationError, InternalServerError } from '@src/errors/httpErrors';
import logger from '@src/utils/logger';
import { hasZodFastifySchemaValidationErrors } from 'fastify-type-provider-zod';

export function errorHandler(
  error: Error | FastifyError | AppError | ZodError,
  request: FastifyRequest,
  reply: FastifyReply
): void {
  // log error
  logger.error({
    message: error.message,
    stack: error.stack,
    path: request.url,
    method: request.method,
    params: request.params,
    query: request.query,
    body: request.body,
  });

  // handle fastify-zod schema validation errors
  if (hasZodFastifySchemaValidationErrors(error)) {
    const details = error.validation.map(err => ({
      path: err.instancePath || err.keyword,
      message: err.message || 'Validation error'
    }));
    
    const validationError = new ValidationError('Validation failed', details);
    reply.status(400).send(validationError.toResponse());
    return;
  }

  // handle zod validation error
  if (error instanceof ZodError) {
    const details = error.errors.map(err => ({
      path: err.path.join('.'),
      message: err.message
    }));
    
    const validationError = new ValidationError('Validation failed', details);
    reply.status(validationError.statusCode).send(validationError.toResponse());
    return;
  }

  // handle custom application error
  if (error instanceof AppError) {
    reply.status(error.statusCode).send(error.toResponse());
    return;
  }

  // handle other unprocessed errors as InternalServerError
  const internalError = new InternalServerError(
    process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : error.message
  );

  reply.status(internalError.statusCode).send(internalError.toResponse());
}