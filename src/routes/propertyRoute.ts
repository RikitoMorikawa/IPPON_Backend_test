import { FastifyPluginCallback } from 'fastify';
import { propertyHandler, propertyNameHandler, propertyInquiryHandler, propertyBatchStatusHandler } from '@src/controllers/propertyController';
import { cognitoAuthMiddleware } from '@src/middleware/middleware';
import { CustomFastifyInstance } from '@src/interfaces/CustomFastifyInstance';

// TypeScript型定義
interface PropertyParams {
  propId: string;
}

interface PropertyQuery {
  objectName?: string;
  registrationRange?: string;
  prefecture?: string;
  exclusive_area?: string;
  property_type?: string;
  price?: string;
  limit?: string;
  page?: string;
  lastKey?: string;
}

const propertyRoutes: FastifyPluginCallback = (app, opts, done) => {
  const customApp = app as CustomFastifyInstance;

  // GET /properties/:propId
  customApp.route({
    method: 'GET',
    url: '/properties/:propId',
    preHandler: cognitoAuthMiddleware,
    handler: (req, reply) => propertyHandler(customApp, req, reply),
  });

  // GET /properties（一覧取得）
  customApp.route({
    method: 'GET',
    url: '/properties',
    preHandler: cognitoAuthMiddleware,
    handler: (req, reply) => propertyHandler(customApp, req, reply),
  });

  // POST /properties
  customApp.route({
    method: 'POST',
    url: '/properties',
    preHandler: cognitoAuthMiddleware,
    handler: (req, reply) => propertyHandler(customApp, req, reply),
  });

  // PUT /properties/:propId
  customApp.route({
    method: 'PUT',
    url: '/properties/:propId',
    preHandler: cognitoAuthMiddleware,
    handler: (req, reply) => propertyHandler(customApp, req, reply),
  });

  // DELETE /properties/:propId
  customApp.route({
    method: 'DELETE',
    url: '/properties/:propId',
    preHandler: cognitoAuthMiddleware,
    handler: (req, reply) => propertyHandler(customApp, req, reply),
  });

  // DELETE /properties (複数削除用)
  customApp.route({
    method: 'DELETE',
    url: '/properties',
    preHandler: cognitoAuthMiddleware,
    handler: (req, reply) => propertyHandler(customApp, req, reply),
  });

  // GET /properties/:propId/inquiry
  customApp.route({
    method: 'GET',
    url: '/properties/:propId/inquiry',
    preHandler: cognitoAuthMiddleware,
    handler: (req, reply) => propertyInquiryHandler(customApp, req, reply),
  });

  // GET /property-names
  customApp.route({
    method: 'GET',
    url: '/property-names',
    preHandler: cognitoAuthMiddleware,
    handler: (req, reply) => propertyNameHandler(customApp, req, reply),
  });

  // GET /properties/batch-status?property_id=xxx
  customApp.route({
    method: 'GET',
    url: '/properties/batch-status',
    preHandler: cognitoAuthMiddleware,
    handler: (req, reply) => propertyBatchStatusHandler(customApp, req, reply),
  });

  // PUT /properties/batch-status/:id - バッチ設定更新
  customApp.route({
    method: 'PUT',
    url: '/properties/batch-status/:id',
    preHandler: cognitoAuthMiddleware,
    handler: (req, reply) => propertyBatchStatusHandler(customApp, req, reply),
  });

  // DELETE /properties/batch-status/:id - バッチ設定削除
  customApp.route({
    method: 'DELETE',
    url: '/properties/batch-status/:id',
    preHandler: cognitoAuthMiddleware,
    handler: (req, reply) => propertyBatchStatusHandler(customApp, req, reply),
  });

  done();
};

export default propertyRoutes;
