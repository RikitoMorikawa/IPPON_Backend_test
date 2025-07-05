import { FastifyPluginCallback } from 'fastify';
import { customerHandler } from '@src/controllers/customerController';
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

// 顧客スキーマ
const customerSchema = z.object({
  id: z.string().describe('顧客ID'),
  client_id: z.string().describe('クライアントID'),
  employee_id: z.string().describe('従業員ID'),
  first_name: z.string().describe('名'),
  last_name: z.string().describe('姓'),
  middle_name: z.string().optional().describe('ミドルネーム'),
  first_name_kana: z.string().optional().describe('名（カナ）'),
  middle_name_kana: z.string().optional().describe('ミドルネーム（カナ）'),
  last_name_kana: z.string().optional().describe('姓（カナ）'),
  birthday: z.string().describe('生年月日'),
  gender: z.string().optional().describe('性別'),
  mail_address: z.string().describe('メールアドレス'),
  phone_number: z.string().optional().describe('電話番号'),
  postcode: z.string().describe('郵便番号'),
  prefecture: z.string().describe('都道府県'),
  city: z.string().describe('市区町村'),
  street_address: z.string().describe('番地'),
  building: z.string().describe('建物名'),
  room_number: z.string().optional().describe('部屋番号'),
  id_card_front_path: z.string().describe('身分証明書表面パス'),
  id_card_back_path: z.string().describe('身分証明書裏面パス'),
  created_at: z.string().describe('作成日時'),
  updated_at: z.string().optional().describe('更新日時'),
  deleted_at: z.string().optional().describe('削除日時')
});

const customerRoutes: FastifyPluginCallback = (app, opts, done) => {
  const customApp = app as typeof app & { ddbDocClient: DynamoDBDocumentClient };
  const typedApp = customApp.withTypeProvider<ZodTypeProvider>();

  // GET /customers/:customerId
  typedApp.route({
    method: 'GET',
    url: '/customers/:customerId',
    schema: {
      description: '顧客詳細の取得',
      tags: ['customers'],
      summary: '顧客詳細取得API',
      params: z.object({
        customerId: z.string().describe('顧客ID')
      }),
      response: {
        200: apiResponseSchema
      }
    },
    preHandler: cognitoAuthMiddleware,
    handler: (req, reply) => customerHandler(customApp, req, reply),
  });

  // GET /customers（一覧取得）
  typedApp.route({
    method: 'GET',
    url: '/customers',
    schema: {
      description: '顧客一覧の取得',
      tags: ['customers'],
      summary: '顧客一覧取得API',
      querystring: z.object({
        limit: z.string().optional().describe('取得件数'),
        lastKey: z.string().optional().describe('ページネーションキー'),
        search: z.string().optional().describe('検索キーワード'),
        sort: z.string().optional().describe('ソート順')
      }),
      response: {
        200: apiResponseSchema
      }
    },
    preHandler: cognitoAuthMiddleware,
    handler: (req, reply) => customerHandler(customApp, req, reply),
  });

  // POST /customers
  typedApp.route({
    method: 'POST',
    url: '/customers',
    schema: {
      description: '顧客の新規作成',
      tags: ['customers'],
      summary: '顧客作成API',
      response: {
        200: apiResponseSchema
      }
    },
    preHandler: cognitoAuthMiddleware,
    handler: (req, reply) => customerHandler(customApp, req, reply),
  });

  // PUT /customers/:customerId
  typedApp.route({
    method: 'PUT',
    url: '/customers/:customerId',
    schema: {
      description: '顧客の更新',
      tags: ['customers'],
      summary: '顧客更新API',
      params: z.object({
        customerId: z.string().describe('顧客ID')
      }),
      response: {
        200: apiResponseSchema
      }
    },
    preHandler: cognitoAuthMiddleware,
    handler: (req, reply) => customerHandler(customApp, req, reply),
  });

  // DELETE /customers/:customerId
  typedApp.route({
    method: 'DELETE',
    url: '/customers/:customerId',
    schema: {
      description: '顧客の削除',
      tags: ['customers'],
      summary: '顧客削除API',
      params: z.object({
        customerId: z.string().describe('顧客ID')
      }),
      response: {
        200: apiResponseSchema
      }
    },
    preHandler: cognitoAuthMiddleware,
    handler: (req, reply) => customerHandler(customApp, req, reply),
  });

  done();
};

export default customerRoutes;
