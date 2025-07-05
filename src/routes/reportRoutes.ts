import { FastifyInstance } from 'fastify';
import {
  getReports,
  getReportDetails,
  getReportsByClient,
  deleteReport,
  createReport,
  saveReport,
} from '@src/controllers/reportController';
import {
  getReportsParamsSchema,
  reportsQuerySchema,
  apiReportListResponseSchema,
  frontendReportListResponseSchema,
  getReportDetailsParamsSchema,
  apiReportDetailsResponseSchema,
  createReportBodySchema,
  apiCreateReportResponseSchema,
  apiDeleteReportResponseSchema,
  saveReportBodySchema,
  saveReportResponseSchema,
  apiSaveReportResponseSchema,
} from '@src/schemas/reportShema';
import {
  apiBadRequestErrorResponseSchema,
  apiNotFoundErrorResponseSchema,
  apiValidationErrorResponseSchema,
  apiServerErrorResponseSchema,
} from '@src/schemas/responseSchema';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { cognitoAuthMiddleware } from '@src/middleware/middleware';
import { z } from 'zod';
import { generateReportExcel } from '@src/services/excelService';
import { downloadReport } from '@src/controllers/reportController';

export default async function reportRoutes(fastify: FastifyInstance): Promise<void> {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  app.route({
    method: 'GET',
    url: '/properties/:property_id/reports',
    // 一時的にスキーマを無効化
    preHandler: cognitoAuthMiddleware,
    handler: getReports,
  });

  app.route({
    method: 'GET',
    url: '/reports/:report_id',
    schema: {
      description: 'Get report details',
      tags: ['reports'],
      summary: 'Get Report Details API',
      params: getReportDetailsParamsSchema,
      response: {
        200: apiReportDetailsResponseSchema,
        400: apiBadRequestErrorResponseSchema,
        404: apiNotFoundErrorResponseSchema,
        422: apiValidationErrorResponseSchema,
        500: apiServerErrorResponseSchema,
      },
    },
    preHandler: cognitoAuthMiddleware,
    handler: getReportDetails,
  });

  app.route({
    method: 'GET',
    url: '/reports',
    schema: {
      description: 'Get reports by client_id',
      tags: ['reports'],
      summary: 'Get Reports List API',
      querystring: reportsQuerySchema,
      response: {
        200: apiReportListResponseSchema,
        400: apiBadRequestErrorResponseSchema,
        404: apiNotFoundErrorResponseSchema,
        422: apiValidationErrorResponseSchema,
        500: apiServerErrorResponseSchema,
      },
    },
    preHandler: cognitoAuthMiddleware,
    handler: getReportsByClient,
  });

  app.route({
    method: 'DELETE',
    url: '/reports/:report_id',
    schema: {
      description: 'Delete a report',
      tags: ['reports'],
      summary: 'Delete Report API',
      params: getReportDetailsParamsSchema,
      response: {
        200: apiDeleteReportResponseSchema,
        400: apiBadRequestErrorResponseSchema,
        404: apiNotFoundErrorResponseSchema,
        422: apiValidationErrorResponseSchema,
        500: apiServerErrorResponseSchema,
      },
    },
    preHandler: cognitoAuthMiddleware,
    handler: deleteReport,
  });

  app.route({
    method: 'POST',
    url: '/properties/:property_id/reports',
    schema: {
      description: 'Create a new report',
      tags: ['reports'],
      summary: 'Create Report API',
      params: z.object({
        property_id: z.string().describe('Property ID / 物件ID')
      }),
      body: createReportBodySchema,
      response: {
        201: apiCreateReportResponseSchema,
        400: apiBadRequestErrorResponseSchema,
        404: apiNotFoundErrorResponseSchema,
        422: apiValidationErrorResponseSchema,
        500: apiServerErrorResponseSchema,
      },
    },
    preHandler: cognitoAuthMiddleware,
    handler: createReport,
  });

  app.route({
    method: 'POST',
    url: '/properties/:property_id/reports/:report_id/save',
    schema: {
      description: 'Save a report',
      tags: ['reports'],
      summary: 'Save Report API',
      params: z.object({
        property_id: z.string().describe('Property ID / 物件ID'),
        report_id: z.string().describe('Report ID / 報告書ID')
      }),
      body: saveReportBodySchema,
      response: {
        200: apiSaveReportResponseSchema,
        400: apiBadRequestErrorResponseSchema,
        404: apiNotFoundErrorResponseSchema,
        422: apiValidationErrorResponseSchema,
        500: apiServerErrorResponseSchema,
      },
    },
    preHandler: cognitoAuthMiddleware,
    handler: saveReport,
  });

  app.route({
    method: 'GET',
    url: '/:property_id/reports/:report_id/download',
    schema: {
      description: 'Download report as Excel file',
      tags: ['reports'],
      summary: 'Download Report API',
      params: z.object({
        property_id: z.string().describe('Property ID / 物件ID'),
        report_id: z.string().describe('Report ID / 報告書ID'),
      }),
      // ファイルダウンロードのレスポンスはスキーマを定義しない
    },
    preHandler: cognitoAuthMiddleware,
    handler: downloadReport,
  });
}
