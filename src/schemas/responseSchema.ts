import { z } from 'zod';

// 400: Bad Request Error
export const apiBadRequestErrorResponseSchema = z
  .object({
    status: z.number().describe('HTTP status code (Bad Request)'),
    message: z.string().describe('Bad request error message'),
    error: z.any().optional().describe('Additional error information'),
  })
  .describe('API Bad Request Error Response');

// 404: Not Found Error
export const apiNotFoundErrorResponseSchema = z
  .object({
    status: z.number().describe('HTTP status code (Not Found)'),
    message: z.string().describe('Not found error message'),
    error: z.any().optional().describe('Additional error information'),
  })
  .describe('API Not Found Error Response');

// 422: Validation Error
export const apiValidationErrorResponseSchema = z
  .object({
    status: z.number().describe('HTTP status code (Validation Error)'),
    message: z.string().describe('Validation error message'),
    error: z.any().optional().describe('Additional error information'),
  })
  .describe('API Validation Error Response');

// 500: Server Error
export const apiServerErrorResponseSchema = z
  .object({
    status: z.number().describe('HTTP status code (Server Error)'),
    message: z.string().describe('Server error message'),
    error: z.any().optional().describe('Additional error information'),
  })
  .describe('API Server Error Response');

export const apiSuccessResponseSchema = z
  .object({
    status: z.number().describe('HTTP status code'),
    message: z.string().describe('Success message'),
  })
  .describe('Generic success response schema');
