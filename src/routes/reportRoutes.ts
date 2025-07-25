import { FastifyInstance } from 'fastify';
import {
  getReports,
  getReportDetails,
  getReportsByClient,
  createReport,
  deleteReport,
  deleteMultipleReports,
  saveReport,
  downloadReport,
  downloadMultipleReportsExcel,
  setupReportBatch,
  updateReportBatch,
} from '@src/controllers/reportController';
import { cognitoAuthMiddleware } from '@src/middleware/middleware';

export default async function reportRoutes(fastify: FastifyInstance): Promise<void> {
  const app = fastify;

  app.route({
    method: 'GET',
    url: '/properties/:property_id/reports',
    preHandler: cognitoAuthMiddleware,
    handler: getReports,
  });

  app.route({
    method: 'GET',
    url: '/reports/:report_id',
    preHandler: cognitoAuthMiddleware,
    handler: getReportDetails,
  });

  app.route({
    method: 'GET',
    url: '/reports',
    preHandler: cognitoAuthMiddleware,
    handler: getReportsByClient,
  });

  app.route({
    method: 'POST',
    url: '/properties/:property_id/reports',
    preHandler: cognitoAuthMiddleware,
    handler: createReport,
  });

  app.route({
    method: 'DELETE',
    url: '/reports/:report_id',
    preHandler: cognitoAuthMiddleware,
    handler: deleteReport,
  });

  // 複数レポート削除API
  app.route({
    method: 'DELETE',
    url: '/reports',
    preHandler: cognitoAuthMiddleware,
    handler: deleteMultipleReports,
  });

  app.route({
    method: 'POST',
    url: '/properties/:property_id/reports/save',
    preHandler: cognitoAuthMiddleware,
    handler: saveReport,
  });

  app.route({
    method: 'POST',
    url: '/properties/:property_id/reports/batch',
    preHandler: cognitoAuthMiddleware,
    handler: setupReportBatch,
  });

  app.route({
    method: 'PUT',
    url: '/properties/:property_id/reports/batch',
    preHandler: cognitoAuthMiddleware,
    handler: updateReportBatch,
  });

  app.route({
    method: 'GET',
    url: '/:property_id/reports/:report_id/download',
    preHandler: cognitoAuthMiddleware,
    handler: downloadReport,
  });

  // 複数レポートExcelダウンロードAPI
  app.route({
    method: 'POST',
    url: '/reports/excel-download',
    preHandler: cognitoAuthMiddleware,
    handler: downloadMultipleReportsExcel,
  });
}
