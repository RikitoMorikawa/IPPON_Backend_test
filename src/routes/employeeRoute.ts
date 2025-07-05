import { FastifyPluginCallback } from 'fastify';
import { cognitoAuthMiddleware } from '../middleware/middleware';
import { employeeHandler, deleteEmployeesHandler, getEmployeeNameListHandler } from '../controllers/employeeController';
import { CustomFastifyInstance } from '../interfaces/CustomFastifyInstance';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';

// レスポンススキーマ
const apiResponseSchema = z.object({
  status: z.number(),
  message: z.string(),
  data: z.any().optional()
});

// メール通知設定スキーマ
const mailNotificationSettingSchema = z.object({
  notification: z.boolean().describe('通知有効'),
  info_form_operator: z.boolean().describe('オペレータからの情報')
});

// 受付時間スキーマ
const receptionHoursSchema = z.object({
  meeting_place: z.array(z.string()).describe('会議場所'),
  meeting_time: z.string().describe('会議時間'),
  reception_start_time: z.string().describe('受付開始時間'),
  reception_end_time: z.string().describe('受付終了時間'),
  blocking_flg: z.boolean().describe('ブロッキングフラグ'),
  day_of_week: z.array(z.string()).describe('曜日')
});

// 従業員スキーマ
const employeeSchema = z.object({
  client_id: z.string().describe('クライアントID'),
  register_timestamp: z.string().describe('登録日時'),
  update_timestamp: z.string().describe('更新日時'),
  employee_id: z.string().describe('従業員ID'),
  admin_flg: z.boolean().describe('管理者フラグ'),
  role: z.string().describe('役割'),
  family_name: z.string().describe('姓'),
  first_name: z.string().describe('名'),
  first_name_kana: z.string().describe('名（カナ）'),
  family_name_kana: z.string().describe('姓（カナ）'),
  mail_address: z.string().describe('メールアドレス'),
  ippn_mail_address: z.string().describe('社内メールアドレス'),
  personal_phone_number: z.string().describe('個人電話番号'),
  icon_image_path: z.string().describe('アイコン画像パス'),
  s3_path: z.string().describe('S3パス'),
  mail_notification_setting: z.array(mailNotificationSettingSchema).describe('メール通知設定'),
  reception_hours: receptionHoursSchema.describe('受付時間')
});

const employeeRoutes: FastifyPluginCallback = (app, opts, done) => {
    const customApp = app as CustomFastifyInstance;
    const typedApp = customApp.withTypeProvider<ZodTypeProvider>();

    // GET /employees/:id
    typedApp.route({
        method: 'GET',
        url: '/employees/:id',
        schema: {
            description: '従業員詳細の取得',
            tags: ['employees'],
            summary: '従業員詳細取得API',
            params: z.object({
                id: z.string().describe('従業員ID')
            }),
            response: {
                200: apiResponseSchema
            }
        },
        preHandler: cognitoAuthMiddleware,
        handler: (req, reply) => employeeHandler(customApp, req, reply)
    });

    // GET /employees（一覧取得）
    typedApp.route({
        method: 'GET',
        url: '/employees',
        schema: {
            description: '従業員一覧の取得',
            tags: ['employees'],
            summary: '従業員一覧取得API',
            querystring: z.object({
                limit: z.string().optional().describe('取得件数'),
                page: z.string().optional().describe('ページ番号'),
                search: z.string().optional().describe('検索キーワード'),
                role: z.string().optional().describe('役割でフィルタ')
            }),
            response: {
                200: apiResponseSchema
            }
        },
        preHandler: cognitoAuthMiddleware,
        handler: (req, reply) => employeeHandler(customApp, req, reply)
    });

    // POST /employees
    typedApp.route({
        method: 'POST',
        url: '/employees',
        schema: {
            description: '従業員の新規作成',
            tags: ['employees'],
            summary: '従業員作成API',
            body: z.object({
                admin_flg: z.boolean().optional().describe('管理者フラグ'),
                role: z.any().optional().describe('役割'),
                family_name: z.string().describe('姓'),
                is_approve: z.boolean().optional().describe('承認フラグ'),
                type: z.string().optional().describe('タイプ'),
                password: z.string().optional().describe('パスワード'),
                first_name: z.string().describe('名'),
                first_name_kana: z.string().describe('名（カナ）'),
                family_name_kana: z.string().describe('姓（カナ）'),
                mail_address: z.string().describe('メールアドレス'),
                ippn_mail_address: z.string().optional().describe('社内メールアドレス'),
                personal_phone_number: z.string().describe('個人電話番号'),
                icon_image_path: z.string().optional().describe('アイコン画像パス'),
                s3_path: z.string().optional().describe('S3パス'),
                mail_notification_setting: z.array(mailNotificationSettingSchema).optional().describe('メール通知設定'),
                reception_hours: receptionHoursSchema.optional().describe('受付時間')
            }),
            response: {
                200: apiResponseSchema
            }
        },
        preHandler: cognitoAuthMiddleware,
        handler: (req, reply) => employeeHandler(customApp, req, reply)
    });

    // PUT /employees/:id
    typedApp.route({
        method: 'PUT',
        url: '/employees/:id',
        schema: {
            description: '従業員の更新',
            tags: ['employees'],
            summary: '従業員更新API',
            params: z.object({
                id: z.string().describe('従業員ID')
            }),
            body: z.object({
                client_id: z.string().describe('クライアントID'),
                employee_id: z.string().describe('従業員ID'),
                family_name: z.string().optional().describe('姓'),
                first_name: z.string().optional().describe('名'),
                family_name_kana: z.string().optional().describe('姓（カナ）'),
                first_name_kana: z.string().optional().describe('名（カナ）'),
                mail_address: z.string().optional().describe('メールアドレス'),
                personal_phone_number: z.string().optional().describe('個人電話番号'),
                ippn_mail_address: z.string().optional().describe('社内メールアドレス'),
                role: z.string().optional().describe('役割')
            }),
            response: {
                200: apiResponseSchema
            }
        },
        preHandler: cognitoAuthMiddleware,
        handler: (req, reply) => employeeHandler(customApp, req, reply)
    });

    // DELETE /employees/:id
    typedApp.route({
        method: 'DELETE',
        url: '/employees/:id',
        schema: {
            description: '従業員の削除',
            tags: ['employees'],
            summary: '従業員削除API',
            params: z.object({
                id: z.string().describe('従業員ID')
            }),
            response: {
                200: apiResponseSchema
            }
        },
        preHandler: cognitoAuthMiddleware,
        handler: (req, reply) => employeeHandler(customApp, req, reply)
    });

    // DELETE /employees/multiple-delete
    typedApp.route({
        method: 'DELETE',
        url: '/employees/multiple-delete',
        schema: {
            description: '複数従業員の一括削除',
            tags: ['employees'],
            summary: '従業員一括削除API',
            body: z.object({
                employeeIds: z.array(z.string()).describe('削除する従業員IDのリスト')
            }),
            response: {
                200: apiResponseSchema
            }
        },
        preHandler: cognitoAuthMiddleware,
        handler: (req, reply) => deleteEmployeesHandler(customApp, req, reply)
    });

    // GET /employees/names-list
    typedApp.route({
        method: 'GET',
        url: '/employees/names-list',
        schema: {
            description: '従業員名一覧の取得',
            tags: ['employees'],
            summary: '従業員名一覧取得API',
            response: {
                200: apiResponseSchema
            }
        },
        preHandler: cognitoAuthMiddleware,
        handler: (req, reply) => getEmployeeNameListHandler(customApp, req, reply)
    });

    done();
};

export default employeeRoutes;