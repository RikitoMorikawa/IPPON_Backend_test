import { FastifyPluginCallback } from 'fastify';
import { customerHandler } from '@src/controllers/customerController';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { cognitoAuthMiddleware } from '@src/middleware/middleware';

// TypeScript型定義
interface CustomerParams {
  customerId: string;
}

interface CustomersQuery {
  limit?: string;
  lastKey?: string;
  search?: string;
  sort?: string;
}

const customerRoutes: FastifyPluginCallback = (app, opts, done) => {
  const customApp = app as typeof app & { ddbDocClient: DynamoDBDocumentClient };

  // GET /customers/:customerId
  customApp.route({
    method: 'GET',
    url: '/customers/:customerId',
    preHandler: cognitoAuthMiddleware,
    handler: (req, reply) => customerHandler(customApp, req, reply),
  });

  // GET /customers（一覧取得）
  customApp.route({
    method: 'GET',
    url: '/customers',
    preHandler: cognitoAuthMiddleware,
    handler: (req, reply) => customerHandler(customApp, req, reply),
  });

  // POST /customers
  customApp.route({
    method: 'POST',
    url: '/customers',
    preHandler: cognitoAuthMiddleware,
    handler: (req, reply) => customerHandler(customApp, req, reply),
  });

  // PUT /customers/:customerId
  customApp.route({
    method: 'PUT',
    url: '/customers/:customerId',
    preHandler: cognitoAuthMiddleware,
    handler: (req, reply) => customerHandler(customApp, req, reply),
  });

  // DELETE /customers/:customerId
  customApp.route({
    method: 'DELETE',
    url: '/customers/:customerId',
    preHandler: cognitoAuthMiddleware,
    handler: (req, reply) => customerHandler(customApp, req, reply),
  });

  done();
};

export default customerRoutes;
