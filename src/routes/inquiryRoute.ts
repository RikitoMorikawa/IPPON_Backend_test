import { FastifyPluginCallback } from 'fastify';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { cognitoAuthMiddleware } from '@src/middleware/middleware';
import { inquiryController } from '@src/controllers/inquiryController';
import { inquiryHistoryController } from '@src/controllers/inquiryHistoryController';

// TypeScript型定義
interface InquiryParams {
  inquiryId: string;
}

interface InquiryQuery {
  inquiryMethod?: string;
  limit?: string;
  page?: string;
  propertyId?: string;
  startDate?: string;
  endDate?: string;
}

interface InquiryHistoryQuery {
  inquiryId?: string;
  page?: string;
  limit?: string;
  title?: string;
}

const inquiryRoutes: FastifyPluginCallback = (app, opts, done) => {
  const customApp = app as typeof app & { ddbDocClient: DynamoDBDocumentClient };

  // GET /inquiry/:inquiryId
  customApp.route({
    method: 'GET',
    url: '/inquiry/:inquiryId',
    preHandler: cognitoAuthMiddleware,
    handler: (req, reply) => inquiryController(customApp, req, reply),
  });

  // GET /inquiry（一覧取得）
  customApp.route({
    method: 'GET',
    url: '/inquiry',
    preHandler: cognitoAuthMiddleware,
    handler: (req, reply) => inquiryController(customApp, req, reply),
  });

  // POST /inquiry
  customApp.route({
    method: 'POST',
    url: '/inquiry',
    preHandler: cognitoAuthMiddleware,
    handler: (req, reply) => inquiryController(customApp, req, reply),
  });

  // PUT /inquiry/:inquiryId
  customApp.route({
    method: 'PUT',
    url: '/inquiry/:inquiryId',
    preHandler: cognitoAuthMiddleware,
    handler: (req, reply) => inquiryController(customApp, req, reply),
  });

  // DELETE /inquiry/:inquiryId
  customApp.route({
    method: 'DELETE',
    url: '/inquiry/:inquiryId',
    preHandler: cognitoAuthMiddleware,
    handler: (req, reply) => inquiryController(customApp, req, reply),
  });

  // GET /inquiry-history/:inquiryId
  customApp.route({
    method: 'GET',
    url: '/inquiry-history/:inquiryId',
    preHandler: cognitoAuthMiddleware,
    handler: (req, reply) => inquiryHistoryController(customApp, req, reply),
  });

  // GET /inquiry-history（一覧取得）
  customApp.route({
    method: 'GET',
    url: '/inquiry-history',
    preHandler: cognitoAuthMiddleware,
    handler: (req, reply) => inquiryHistoryController(customApp, req, reply),
  });

  // POST /inquiry-history
  customApp.route({
    method: 'POST',
    url: '/inquiry-history',
    preHandler: cognitoAuthMiddleware,
    handler: (req, reply) => inquiryHistoryController(customApp, req, reply),
  });

  // PUT /inquiry-history/:inquiryId
  customApp.route({
    method: 'PUT',
    url: '/inquiry-history/:inquiryId',
    preHandler: cognitoAuthMiddleware,
    handler: (req, reply) => inquiryHistoryController(customApp, req, reply),
  });

  // DELETE /inquiry-history/:inquiryId
  customApp.route({
    method: 'DELETE',
    url: '/inquiry-history/:inquiryId',
    preHandler: cognitoAuthMiddleware,
    handler: (req, reply) => inquiryHistoryController(customApp, req, reply),
  });

  done();
};

export default inquiryRoutes;
