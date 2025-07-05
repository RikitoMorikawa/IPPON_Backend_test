import { FastifyInstance } from 'fastify';
import { getReports } from '@src/controllers/reportController';
import { 
  getReportsParamsSchema, 
  getReportsQuerySchema, 
  apiReportListResponseSchema
} from '@src/schemas/reportShema';
import {
  apiBadRequestErrorResponseSchema,
  apiNotFoundErrorResponseSchema,
  apiValidationErrorResponseSchema,
  apiServerErrorResponseSchema
} from '@src/schemas/responseSchema';
import { ZodTypeProvider } from 'fastify-type-provider-zod';

export default async function reportRoutes(fastify: FastifyInstance): Promise<void> {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  app.route({
    method: 'GET',
    url: '/properties/:property_id/reports',
    schema: {
      description: 'Get list of reports for a property',
      tags: ['reports'],
      summary: 'Get Reports List API',
      params: getReportsParamsSchema,
      querystring: getReportsQuerySchema,
      response: {
        200: apiReportListResponseSchema,
        400: apiBadRequestErrorResponseSchema,
        404: apiNotFoundErrorResponseSchema,
        422: apiValidationErrorResponseSchema,
        500: apiServerErrorResponseSchema
      }
    },
    handler: getReports
  });
}