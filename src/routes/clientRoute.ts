import { FastifyPluginCallback } from 'fastify';
import { clientHandler } from '../controllers/clientController';
import { cognitoAuthMiddleware } from '../middleware/middleware';
import { CustomFastifyInstance } from '../interfaces/CustomFastifyInstance';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';

// レスポンススキーマ
const apiResponseSchema = z.object({
  status: z.number(),
  message: z.string(),
  data: z.any().optional()
});

// クライアントスキーマ
const clientSchema = z.object({
  id: z.string().describe('クライアントID'),
  register_timestamp: z.string().describe('登録日時'),
  update_timestamp: z.string().describe('更新日時'),
  client_name: z.string().describe('クライアント名'),
  client_name_kana: z.string().describe('クライアント名（カナ）'),
  client_tell: z.string().describe('電話番号'),
  client_mail_address: z.string().describe('メールアドレス'),
  hp_address: z.string().describe('HPアドレス'),
  postcode: z.string().describe('郵便番号'),
  prefecture: z.string().describe('都道府県'),
  city: z.string().describe('市区町村'),
  steet_address: z.string().describe('番地'),
  building: z.string().describe('建物名'),
  s3_path: z.string().describe('S3パス'),
  transaction_ledger_option: z.boolean().describe('取引台帳オプション')
});

const clientRoutes: FastifyPluginCallback = (app, opts, done) => {
    const customApp = app as CustomFastifyInstance;
    const typedApp = customApp.withTypeProvider<ZodTypeProvider>();

    // GET /clients/:client_id
    typedApp.route({
        method: 'GET',
        url: '/clients/:client_id',
        schema: {
            description: 'クライアント詳細の取得',
            tags: ['clients'],
            summary: 'クライアント詳細取得API',
            params: z.object({
                client_id: z.string().describe('クライアントID')
            }),
            response: {
                200: apiResponseSchema
            }
        },
        preHandler: cognitoAuthMiddleware,
        handler: (req, reply) => clientHandler(customApp, req, reply)
    });

    // GET /clients（一覧取得）
    typedApp.route({
        method: 'GET',
        url: '/clients',
        schema: {
            description: 'クライアント一覧の取得',
            tags: ['clients'],
            summary: 'クライアント一覧取得API',
            querystring: z.object({
                limit: z.string().optional().describe('取得件数'),
                page: z.string().optional().describe('ページ番号'),
                search: z.string().optional().describe('検索キーワード'),
                sort: z.string().optional().describe('ソート順')
            }),
            response: {
                200: apiResponseSchema
            }
        },
        preHandler: cognitoAuthMiddleware,
        handler: (req, reply) => clientHandler(customApp, req, reply)
    });

    // POST /clients
    typedApp.route({
        method: 'POST',
        url: '/clients',
        schema: {
            description: 'クライアントの新規作成',
            tags: ['clients'],
            summary: 'クライアント作成API',
            body: z.object({
                client_name: z.string().describe('クライアント名'),
                client_name_kana: z.string().describe('クライアント名（カナ）'),
                client_tell: z.string().optional().describe('電話番号'),
                client_mail_address: z.string().describe('メールアドレス'),
                hp_address: z.string().optional().describe('HPアドレス'),
                postcode: z.string().optional().describe('郵便番号'),
                prefecture: z.string().optional().describe('都道府県'),
                city: z.string().optional().describe('市区町村'),
                steet_address: z.string().optional().describe('番地'),
                building: z.string().optional().describe('建物名'),
                s3_path: z.string().optional().describe('S3パス'),
                transaction_ledger_option: z.boolean().optional().describe('取引台帳オプション')
            }),
            response: {
                200: apiResponseSchema
            }
        },
        preHandler: cognitoAuthMiddleware,
        handler: (req, reply) => clientHandler(customApp, req, reply)
    });

    // PUT /clients/:client_id
    typedApp.route({
        method: 'PUT',
        url: '/clients/:client_id',
        schema: {
            description: 'クライアントの更新',
            tags: ['clients'],
            summary: 'クライアント更新API',
            params: z.object({
                client_id: z.string().describe('クライアントID')
            }),
            body: z.object({
                client_id: z.string().describe('クライアントID'),
                client_name: z.string().optional().describe('クライアント名'),
                client_name_kana: z.string().optional().describe('クライアント名（カナ）'),
                transaction_ledger_option: z.any().describe('取引台帳オプション'),
                client_tell: z.string().optional().describe('電話番号'),
                client_mail_address: z.string().optional().describe('メールアドレス'),
                hp_address: z.string().optional().describe('HPアドレス'),
                postcode: z.string().optional().describe('郵便番号'),
                prefecture: z.string().optional().describe('都道府県'),
                city: z.string().optional().describe('市区町村'),
                steet_address: z.string().optional().describe('番地'),
                building: z.string().optional().describe('建物名'),
                s3_path: z.string().optional().describe('S3パス')
            }),
            response: {
                200: apiResponseSchema
            }
        },
        preHandler: cognitoAuthMiddleware,
        handler: (req, reply) => clientHandler(customApp, req, reply)
    });

    // DELETE /clients/:client_id
    typedApp.route({
        method: 'DELETE',
        url: '/clients/:client_id',
        schema: {
            description: 'クライアントの削除',
            tags: ['clients'],
            summary: 'クライアント削除API',
            params: z.object({
                client_id: z.string().describe('クライアントID')
            }),
            response: {
                200: apiResponseSchema
            }
        },
        preHandler: cognitoAuthMiddleware,
        handler: (req, reply) => clientHandler(customApp, req, reply)
    });

    done();
};

export default clientRoutes;
