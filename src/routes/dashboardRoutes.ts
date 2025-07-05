import { FastifyPluginCallback } from 'fastify';
import { dashboardHandler } from '@src/controllers/dashboardController';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { cognitoAuthMiddleware } from '@src/middleware/middleware';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';

// レスポンススキーマ
const apiResponseSchema = z.object({
  status: z.number(),
  message: z.string(),
  data: z.any().optional()
});

const dashboardRoutes: FastifyPluginCallback = (app, opts, done) => {
  const customApp = app as typeof app & { ddbDocClient: DynamoDBDocumentClient };
  const typedApp = customApp.withTypeProvider<ZodTypeProvider>();

  // GET /dashboard/:customerId
  typedApp.route({
    method: 'GET',
    url: '/dashboard/:customerId',
    schema: {
      description: '顧客別ダッシュボードデータの取得',
      tags: ['dashboard'],
      summary: '顧客別ダッシュボード取得API',
      params: z.object({
        customerId: z.string().describe('顧客ID')
      }),
      response: {
        200: apiResponseSchema
      }
    },
    preHandler: cognitoAuthMiddleware,
    handler: (req, reply) => dashboardHandler(customApp, req, reply),
  });

  // GET /dashboard（全体ダッシュボード）
  typedApp.route({
    method: 'GET',
    url: '/dashboard',
    schema: {
      description: 'ダッシュボードデータの取得',
      tags: ['dashboard'],
      summary: 'ダッシュボード取得API',
      querystring: z.object({
        name: z.string().optional().describe('名前'),
        firstName: z.string().optional().describe('名'),
        lastName: z.string().optional().describe('姓'),
        inquiryTimestamp: z.string().optional().describe('問い合わせ日時'),
        manager: z.string().optional().describe('担当者'),
        inquiryMethod: z.string().optional().describe('問い合わせ方法'),
        page: z.string().optional().describe('ページ番号'),
        limit: z.string().optional().describe('取得件数'),
        propertyId: z.string().optional().describe('物件ID'),
        inquiryId: z.string().optional().describe('問い合わせID'),
        employeeId: z.string().optional().describe('従業員ID'),
        period: z.string().optional().describe('期間'),
        type: z.string().optional().describe('タイプ')
      }),
      response: {
        200: apiResponseSchema
      }
    },
    preHandler: cognitoAuthMiddleware,
    handler: (req, reply) => dashboardHandler(customApp, req, reply),
  });

  done();
};

export default dashboardRoutes;
