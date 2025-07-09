import { FastifyPluginCallback } from 'fastify';
import { dashboardHandler } from '@src/controllers/dashboardController';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { cognitoAuthMiddleware } from '@src/middleware/middleware';

// TypeScript型定義
interface DashboardParams {
  customerId: string;
}

interface DashboardQuery {
  name?: string;
  firstName?: string;
  lastName?: string;
  inquiryTimestamp?: string;
  manager?: string;
  inquiryMethod?: string;
  page?: string;
  limit?: string;
  propertyId?: string;
  inquiryId?: string;
  employeeId?: string;
  period?: string;
  type?: string;
}

const dashboardRoutes: FastifyPluginCallback = (app, opts, done) => {
  const customApp = app as typeof app & { ddbDocClient: DynamoDBDocumentClient };

  // GET /dashboard/:customerId
  customApp.route({
    method: 'GET',
    url: '/dashboard/:customerId',
    preHandler: cognitoAuthMiddleware,
    handler: (req, reply) => dashboardHandler(customApp, req, reply),
  });

  // GET /dashboard（全体ダッシュボード）
  customApp.route({
    method: 'GET',
    url: '/dashboard',
    preHandler: cognitoAuthMiddleware,
    handler: (req, reply) => dashboardHandler(customApp, req, reply),
  });

  done();
};

export default dashboardRoutes;
