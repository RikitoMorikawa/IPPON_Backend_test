import { FastifyPluginCallback } from 'fastify';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { cognitoAuthMiddleware } from '@src/middleware/middleware';
import { inquiryController } from '@src/controllers/inquiryController';
import { inquiryHistoryController } from '@src/controllers/inquiryHistoryController';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';

// レスポンススキーマ
const apiResponseSchema = z.object({
  status: z.number(),
  message: z.string(),
  data: z.any().optional()
});

// 問い合わせスキーマ
const inquirySchema = z.object({
  id: z.string().describe('問い合わせID'),
  client_id: z.string().describe('クライアントID'),
  customer_id: z.string().describe('顧客ID'),
  property_id: z.string().optional().describe('物件ID'),
  employee_id: z.string().optional().describe('従業員ID'),
  inquired_at: z.string().describe('問い合わせ日時'),
  title: z.string().optional().describe('タイトル'),
  category: z.string().optional().describe('カテゴリ'),
  type: z.string().optional().describe('タイプ'),
  method: z.string().describe('問い合わせ方法'),
  summary: z.string().optional().describe('概要'),
  created_at: z.string().describe('作成日時'),
  updated_at: z.string().optional().describe('更新日時'),
  deleted_at: z.string().optional().describe('削除日時')
});

const inquiryRoutes: FastifyPluginCallback = (app, opts, done) => {
  const customApp = app as typeof app & { ddbDocClient: DynamoDBDocumentClient };
  const typedApp = customApp.withTypeProvider<ZodTypeProvider>();

  // GET /inquiry/:inquiryId
  typedApp.route({
    method: 'GET',
    url: '/inquiry/:inquiryId',
    schema: {
      description: '問い合わせ詳細の取得',
      tags: ['inquiries'],
      summary: '問い合わせ詳細取得API',
      params: z.object({
        inquiryId: z.string().describe('問い合わせID')
      }),
      response: {
        200: apiResponseSchema
      }
    },
    preHandler: cognitoAuthMiddleware,
    handler: (req, reply) => inquiryController(customApp, req, reply),
  });

  // GET /inquiry（一覧取得）
  typedApp.route({
    method: 'GET',
    url: '/inquiry',
    schema: {
      description: '問い合わせ一覧の取得',
      tags: ['inquiries'],
      summary: '問い合わせ一覧取得API',
      querystring: z.object({
        inquiryMethod: z.string().optional().describe('問い合わせ方法'),
        limit: z.string().optional().describe('取得件数'),
        page: z.string().optional().describe('ページ番号'),
        propertyId: z.string().optional().describe('物件ID'),
        startDate: z.string().optional().describe('開始日'),
        endDate: z.string().optional().describe('終了日')
      }),
      response: {
        200: apiResponseSchema
      }
    },
    preHandler: cognitoAuthMiddleware,
    handler: (req, reply) => inquiryController(customApp, req, reply),
  });

  // POST /inquiry
  typedApp.route({
    method: 'POST',
    url: '/inquiry',
    schema: {
      description: '問い合わせの新規作成',
      tags: ['inquiries'],
      summary: '問い合わせ作成API',
      body: inquirySchema.omit({ id: true, created_at: true }),
      response: {
        200: apiResponseSchema
      }
    },
    preHandler: cognitoAuthMiddleware,
    handler: (req, reply) => inquiryController(customApp, req, reply),
  });

  // PUT /inquiry/:inquiryId
  typedApp.route({
    method: 'PUT',
    url: '/inquiry/:inquiryId',
    schema: {
      description: '問い合わせの更新',
      tags: ['inquiries'],
      summary: '問い合わせ更新API',
      params: z.object({
        inquiryId: z.string().describe('問い合わせID')
      }),
      body: inquirySchema.partial(),
      response: {
        200: apiResponseSchema
      }
    },
    preHandler: cognitoAuthMiddleware,
    handler: (req, reply) => inquiryController(customApp, req, reply),
  });

  // DELETE /inquiry/:inquiryId
  typedApp.route({
    method: 'DELETE',
    url: '/inquiry/:inquiryId',
    schema: {
      description: '問い合わせの削除',
      tags: ['inquiries'],
      summary: '問い合わせ削除API',
      params: z.object({
        inquiryId: z.string().describe('問い合わせID')
      }),
      response: {
        200: apiResponseSchema
      }
    },
    preHandler: cognitoAuthMiddleware,
    handler: (req, reply) => inquiryController(customApp, req, reply),
  });

  // GET /inquiry-history/:inquiryId
  typedApp.route({
    method: 'GET',
    url: '/inquiry-history/:inquiryId',
    schema: {
      description: '問い合わせ履歴詳細の取得',
      tags: ['inquiries'],
      summary: '問い合わせ履歴詳細取得API',
      params: z.object({
        inquiryId: z.string().describe('問い合わせID')
      }),
      response: {
        200: apiResponseSchema
      }
    },
    preHandler: cognitoAuthMiddleware,
    handler: (req, reply) => inquiryHistoryController(customApp, req, reply),
  });

  // GET /inquiry-history（一覧取得）
  typedApp.route({
    method: 'GET',
    url: '/inquiry-history',
    schema: {
      description: '問い合わせ履歴一覧の取得',
      tags: ['inquiries'],
      summary: '問い合わせ履歴一覧取得API',
      querystring: z.object({
        inquiryId: z.string().optional().describe('問い合わせID'),
        page: z.string().optional().describe('ページ番号'),
        limit: z.string().optional().describe('取得件数'),
        title: z.string().optional().describe('タイトル')
      }),
      response: {
        200: apiResponseSchema
      }
    },
    preHandler: cognitoAuthMiddleware,
    handler: (req, reply) => inquiryHistoryController(customApp, req, reply),
  });

  // POST /inquiry-history
  typedApp.route({
    method: 'POST',
    url: '/inquiry-history',
    schema: {
      description: '問い合わせ履歴の新規作成',
      tags: ['inquiries'],
      summary: '問い合わせ履歴作成API',
      body: z.object({
        inquiryId: z.string().describe('問い合わせID'),
        title: z.string().optional().describe('タイトル'),
        content: z.string().optional().describe('内容')
      }),
      response: {
        200: apiResponseSchema
      }
    },
    preHandler: cognitoAuthMiddleware,
    handler: (req, reply) => inquiryHistoryController(customApp, req, reply),
  });

  // PUT /inquiry-history/:inquiryId
  typedApp.route({
    method: 'PUT',
    url: '/inquiry-history/:inquiryId',
    schema: {
      description: '問い合わせ履歴の更新',
      tags: ['inquiries'],
      summary: '問い合わせ履歴更新API',
      params: z.object({
        inquiryId: z.string().describe('問い合わせID')
      }),
      body: z.object({
        title: z.string().optional().describe('タイトル'),
        content: z.string().optional().describe('内容')
      }),
      response: {
        200: apiResponseSchema
      }
    },
    preHandler: cognitoAuthMiddleware,
    handler: (req, reply) => inquiryHistoryController(customApp, req, reply),
  });

  // DELETE /inquiry-history/:inquiryId
  typedApp.route({
    method: 'DELETE',
    url: '/inquiry-history/:inquiryId',
    schema: {
      description: '問い合わせ履歴の削除',
      tags: ['inquiries'],
      summary: '問い合わせ履歴削除API',
      params: z.object({
        inquiryId: z.string().describe('問い合わせID')
      }),
      response: {
        200: apiResponseSchema
      }
    },
    preHandler: cognitoAuthMiddleware,
    handler: (req, reply) => inquiryHistoryController(customApp, req, reply),
  });

  done();
};

export default inquiryRoutes;
