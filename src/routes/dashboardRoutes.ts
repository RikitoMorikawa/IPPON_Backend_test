import { FastifyPluginCallback } from 'fastify';
import {getDashBoardCustomers } from '@src/controllers/dashboardController';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { cognitoAuthMiddleware } from '@src/middleware/middleware';
import { DashboardCustomerQueryParams, DashboardResponse, GetDashboardCustomerParams, GetDashboardResponse } from '@src/interfaces/dashboardInterfaces';

const dashboardRoutes: FastifyPluginCallback = (app, opts, done) => {
  const customApp = app as typeof app & { ddbDocClient: DynamoDBDocumentClient };

  // GET /dashboard（全体ダッシュボード）
    customApp.route<{
      Querystring:DashboardCustomerQueryParams;
      Reply: DashboardResponse;
    }>({
    method: 'GET',
    url: '/dashboard',
    preHandler: cognitoAuthMiddleware,
    handler: (request, reply) => getDashBoardCustomers(customApp, request, reply),
  });

  done();
};

export default dashboardRoutes;
