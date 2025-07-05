import { FastifyPluginCallback } from 'fastify';
import { propertyHandler, propertyNameHandler } from '@src/controllers/propertyController';
import { cognitoAuthMiddleware } from '@src/middleware/middleware';
import { CustomFastifyInstance } from '@src/interfaces/CustomFastifyInstance';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';

// レスポンススキーマ
const apiResponseSchema = z.object({
  status: z.number(),
  message: z.string(),
  data: z.any().optional()
});

// 最寄り駅のスキーマ
const nearestStationSchema = z.object({
  line_name: z.string().describe('路線名'),
  station_name: z.string().describe('駅名'),
  walk_minutes: z.number().describe('徒歩分数')
});

// 物件詳細スキーマ
const propertyDetailsSchema = z.object({
  land_area: z.number().optional().describe('土地面積'),
  land_rights: z.string().optional().describe('土地権利'),
  land_category: z.string().optional().describe('地目'),
  usage_zone: z.string().optional().describe('用途地域'),
  building_coverage: z.number().optional().describe('建ぺい率'),
  floor_area_ratio: z.number().optional().describe('容積率'),
  road_situation: z.string().optional().describe('接道状況'),
  layout: z.string().optional().describe('間取り'),
  structure: z.string().optional().describe('建物構造'),
  built_year: z.string().optional().describe('築年月'),
  private_area: z.number().optional().describe('専有面積'),
  balcony_area: z.number().optional().describe('バルコニー面積'),
  total_units: z.number().optional().describe('総戸数'),
  management_fee: z.number().optional().describe('管理費'),
  repair_fund: z.number().optional().describe('修繕積立金'),
  community_fee: z.string().optional().describe('自治会費'),
  parking: z.string().optional().describe('駐車場'),
  management_type: z.string().optional().describe('管理方式'),
  floor_area: z.number().optional().describe('延床面積'),
  topography: z.string().optional().describe('地勢'),
  facilities: z.string().optional().describe('設備'),
  school_area: z.string().optional().describe('学区')
}).passthrough();

// 物件スキーマ
const propertySchema = z.object({
  id: z.string().describe('物件ID'),
  client_id: z.string().describe('クライアントID'),
  name: z.string().describe('物件名'),
  type: z.enum(['land', 'apartment', 'new_house']).describe('物件タイプ'),
  postal_code: z.string().describe('郵便番号'),
  prefecture: z.string().describe('都道府県'),
  city: z.string().describe('市区町村'),
  block_number: z.string().describe('番地'),
  building: z.string().optional().describe('建物名'),
  room_number: z.string().optional().describe('部屋番号'),
  nearest_stations: z.array(nearestStationSchema).optional().describe('最寄り駅情報'),
  owner_last_name: z.string().describe('所有者姓'),
  owner_first_name: z.string().describe('所有者名'),
  owner_last_name_kana: z.string().optional().describe('所有者姓（カナ）'),
  owner_first_name_kana: z.string().optional().describe('所有者名（カナ）'),
  sales_start_date: z.string().describe('販売開始日'),
  price: z.number().describe('価格'),
  delivery_time: z.string().optional().describe('引渡時期'),
  delivery_method: z.string().optional().describe('引渡方法'),
  transaction_type: z.string().optional().describe('取引態様'),
  current_condition: z.string().optional().describe('現況'),
  image_urls: z.array(z.string()).optional().describe('画像URL'),
  remarks: z.string().optional().describe('備考'),
  details: propertyDetailsSchema.optional().describe('物件詳細'),
  created_at: z.string().describe('作成日時'),
  updated_at: z.string().optional().describe('更新日時'),
  deleted_at: z.string().optional().describe('削除日時'),
  inquiry_count: z.number().describe('問い合わせ数')
});

const propertyRoutes: FastifyPluginCallback = (app, opts, done) => {
  const customApp = app as CustomFastifyInstance;
  const typedApp = customApp.withTypeProvider<ZodTypeProvider>();

  // GET /properties/:propId
  typedApp.route({
    method: 'GET',
    url: '/properties/:propId',
    schema: {
      description: '物件詳細の取得',
      tags: ['properties'],
      summary: '物件詳細取得API',
      params: z.object({
        propId: z.string().describe('物件ID')
      }),
      response: {
        200: apiResponseSchema
      }
    },
    preHandler: cognitoAuthMiddleware,
    handler: (req, reply) => propertyHandler(customApp, req, reply),
  });

  // GET /properties（一覧取得）
  typedApp.route({
    method: 'GET',
    url: '/properties',
    schema: {
      description: '物件一覧の取得',
      tags: ['properties'],
      summary: '物件一覧取得API',
      querystring: z.object({
        objectName: z.string().optional().describe('物件名'),
        registrationRange: z.string().optional().describe('登録期間'),
        prefecture: z.string().optional().describe('都道府県'),
        exclusive_area: z.string().optional().describe('専有面積'),
        property_type: z.string().optional().describe('物件タイプ'),
        price: z.string().optional().describe('価格範囲'),
        limit: z.string().optional().describe('取得件数'),
        page: z.string().optional().describe('ページ番号'),
        lastKey: z.string().optional().describe('ページネーションキー')
      }),
      response: {
        200: apiResponseSchema
      }
    },
    preHandler: cognitoAuthMiddleware,
    handler: (req, reply) => propertyHandler(customApp, req, reply),
  });

  // POST /properties
  typedApp.route({
    method: 'POST',
    url: '/properties',
    schema: {
      description: '物件の新規作成',
      tags: ['properties'],
      summary: '物件作成API',
      response: {
        200: apiResponseSchema
      }
    },
    preHandler: cognitoAuthMiddleware,
    handler: (req, reply) => propertyHandler(customApp, req, reply),
  });

  // PUT /properties/:propId
  typedApp.route({
    method: 'PUT',
    url: '/properties/:propId',
    schema: {
      description: '物件の更新',
      tags: ['properties'],
      summary: '物件更新API',
      params: z.object({
        propId: z.string().describe('物件ID')
      }),
      response: {
        200: apiResponseSchema
      }
    },
    preHandler: cognitoAuthMiddleware,
    handler: (req, reply) => propertyHandler(customApp, req, reply),
  });

  // DELETE /properties/:propId
  typedApp.route({
    method: 'DELETE',
    url: '/properties/:propId',
    schema: {
      description: '物件の削除',
      tags: ['properties'],
      summary: '物件削除API',
      params: z.object({
        propId: z.string().describe('物件ID')
      }),
      response: {
        200: apiResponseSchema
      }
    },
    preHandler: cognitoAuthMiddleware,
    handler: (req, reply) => propertyHandler(customApp, req, reply),
  });

  // GET /property-names
  typedApp.route({
    method: 'GET',
    url: '/property-names',
    schema: {
      description: '物件名一覧の取得',
      tags: ['properties'],
      summary: '物件名一覧取得API',
      response: {
        200: apiResponseSchema
      }
    },
    preHandler: cognitoAuthMiddleware,
    handler: (req, reply) => propertyNameHandler(customApp, req, reply),
  });

  done();
};

export default propertyRoutes;
