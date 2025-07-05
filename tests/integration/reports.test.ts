import { describe, it, expect, beforeAll, afterAll, vi, beforeEach } from 'vitest';
import { getApp } from '@src/app';
import { FastifyInstance } from 'fastify';
import { mockAuthHeaders } from '../setup';
import axios from 'axios';

// テストシナリオ
/*
  1. 成功ケース
    1.1 報告書作成（AI APIとの連携確認）
    1.2 報告書一覧取得
    1.3 報告書詳細取得
    1.4 報告書更新（下書き保存）
    1.5 報告書更新（完了）
    1.6 報告書削除

  2. エラーケース
    2.1 無効なデータでの報告書作成
    2.2 存在しない物件での報告書作成
    2.3 存在しない報告書の取得
    2.4 存在しない報告書の削除
*/

// モックを最上位で定義
vi.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: vi.fn().mockImplementation(() => ({
    send: vi.fn()
  })),
  CreateTableCommand: vi.fn(),
  DescribeTableCommand: vi.fn(),
  ResourceNotFoundException: vi.fn()
}));

vi.mock('@aws-sdk/lib-dynamodb', () => {
  return {
    DynamoDBDocumentClient: {
      from: vi.fn().mockImplementation(() => ({
        send: vi.fn().mockImplementation(async (command) => {
          const commandName = command.constructor.name;
          
          if (commandName === 'ScanCommand') {
            // 物件情報を返す
            if (command.input.TableName?.includes('properties')) {
              return {
                Items: [{
                  id: 'prop-001',
                  client_id: 'client-001',
                  name: 'テスト物件1',
                  address: '東京都渋谷区1-1-1',
                  price: '50000000',
                  sales_start_date: '2024-01-01',
                  is_suumo_published: true,
                  views_count: 100,
                  inquiries_count: 10,
                  business_meeting_count: 5,
                  viewing_count: 3,
                  created_at: '2024-01-01T00:00:00Z'
                }]
              };
            }
            return { Items: [] };
          }
          
          if (commandName === 'PutCommand') {
            // 作成したレポートを返す
            return { Attributes: command.input.Item };
          }
          
          if (commandName === 'GetCommand') {
            // レポート詳細を返す
            const reportId = command.input.Key?.id;
            if (reportId === 'RPT-20240101-ABC') {
              return {
                Item: {
                  id: 'RPT-20240101-ABC',
                  client_id: 'client-001',
                  property_id: 'prop-001',
                  report_start_date: '2024-01-01',
                  report_end_date: '2024-01-31',
                  title: 'Report RPT-20240101-ABC',
                  is_draft: true,
                  current_status: 'draft',
                  summary: 'AI生成された要約',
                  price: '50000000',
                  sales_start_date: '2024-01-01',
                  is_suumo_published: true,
                  views_count: 100,
                  inquiries_count: 10,
                  business_meeting_count: 5,
                  viewing_count: 3,
                  created_at: '2024-01-01T00:00:00Z'
                }
              };
            }
            return { Item: undefined };
          }
          
          if (commandName === 'QueryCommand') {
            return {
              Items: [
                {
                  id: 'RPT-20240101-ABC',
                  client_id: 'client-001',
                  property_id: 'prop-001',
                  report_start_date: '2024-01-01',
                  report_end_date: '2024-01-31',
                  title: 'Report 1',
                  is_draft: true,
                  current_status: 'draft',
                  price: '50000000',
                  sales_start_date: '2024-01-01',
                  is_suumo_published: true,
                  created_at: '2024-01-01T00:00:00Z'
                },
                {
                  id: 'RPT-20240201-DEF',
                  client_id: 'client-001',
                  property_id: 'prop-001',
                  report_start_date: '2024-02-01',
                  report_end_date: '2024-02-29',
                  title: 'Report 2',
                  is_draft: false,
                  current_status: 'completed',
                  price: '50000000',
                  sales_start_date: '2024-01-01',
                  is_suumo_published: false,
                  created_at: '2024-02-01T00:00:00Z'
                }
              ],
              Count: 2
            };
          }
          
          if (commandName === 'DeleteCommand') {
            return { Attributes: command.input.Key };
          }
          
          return {};
        })
      }))
    },
    GetCommand: vi.fn(),
    PutCommand: vi.fn(),
    QueryCommand: vi.fn(),
    DeleteCommand: vi.fn(),
    UpdateCommand: vi.fn(),
    ScanCommand: vi.fn()
  };
});

// Cognitoミドルウェアモック
vi.mock('@src/middleware/middleware', () => ({
  cognitoAuthMiddleware: vi.fn().mockImplementation((req, reply, done) => {
    req.userEmail = 'test@example.com';
    req.userGroup = 'admin';
    req.user = {
      email: 'test@example.com',
      group: 'admin',
      sub: 'mock-user-sub',
      'custom:clientId': 'client-001',
      'custom:type': 'employee',
      'custom:role': 'admin'
    };
    done();
  }),
  registerMiddlewares: vi.fn().mockResolvedValue(undefined)
}));

// axiosはモックしない（実際のAI APIへリクエストを送信）

describe('Reports API Integration Tests', () => {
  let app: FastifyInstance;
  let dynamoDBMock: any;

  beforeAll(async () => {
    // DynamoDBのモックを取得
    const { DynamoDBDocumentClient } = await import('@aws-sdk/lib-dynamodb');
    dynamoDBMock = (DynamoDBDocumentClient.from as any).mock.results[0]?.value;

    app = await getApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('成功シナリオ', () => {
    it('1.1 報告書作成（AI APIとの連携確認）', async () => {
      const createReportData = {
        client_id: 'client-001',
        property_id: 'prop-001',
        property_name: 'テスト物件1',
        report_start_date: '2024-01-01',
        report_end_date: '2024-01-31',
        customer_interactions: [
          {
            customer_id: 'cust-001',
            customer_name: '田中太郎',
            inquired_at: '2024-01-15 10:00:00',
            category: '問い合わせ',
            type: 'email',
            summary: '物件の詳細について問い合わせがありました。間取りや価格、周辺環境について説明しました。'
          },
          {
            customer_id: 'cust-002',
            customer_name: '山田花子',
            inquired_at: '2024-01-20 14:00:00',
            category: '内見',
            type: 'phone',
            summary: '内見を実施しました。お客様は物件の日当たりや設備に満足されていました。購入を前向きに検討中です。'
          }
        ]
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/properties/prop-001/reports',
        headers: mockAuthHeaders,
        payload: createReportData
      });

      console.log('Response:', response.body);

      expect(response.statusCode).toBe(201);
      const payload = JSON.parse(response.body);
      
      // レスポンスの基本構造を確認
      expect(payload.status).toBe(201);
      expect(payload.message).toBe('Successfully created report');
      expect(payload.data).toBeDefined();
      
      // 仕様に従ったレスポンス形式を確認（report_idがないこと）
      expect(payload.data.report_id).toBeUndefined();
      expect(payload.data.client_id).toBe('client-001');
      expect(payload.data.property_id).toBe('prop-001');
      expect(payload.data.property_name).toBe('テスト物件1');
      expect(payload.data.current_status).toBe('draft');
      
      // AI APIによる要約が含まれていることを確認
      expect(payload.data.summary).toBeDefined();
      expect(typeof payload.data.summary).toBe('string');
      expect(payload.data.summary.length).toBeGreaterThan(0);
      
      // 顧客対応内容がAIにより要約されていることを確認
      expect(payload.data.customer_interactions).toBeDefined();
      expect(Array.isArray(payload.data.customer_interactions)).toBe(true);
      
      if (payload.data.customer_interactions.length > 0) {
        const interaction = payload.data.customer_interactions[0];
        expect(interaction.customer_id).toBeDefined();
        expect(interaction.customer_name).toBeDefined();
        expect(interaction.inquired_at).toBeDefined();
        expect(interaction.content).toBeDefined(); // AI要約後の内容
        expect(typeof interaction.content).toBe('string');
      }
      
      // ポータル情報・統計情報を確認
      expect(payload.data.suumo).toBe(true);
      expect(payload.data.views_count).toBe(100);
      expect(payload.data.inquiries_count).toBe(10);
      expect(payload.data.business_meeting_count).toBe(5);
      expect(payload.data.viewing_count).toBe(3);
    }, 30000); // AI APIのタイムアウトを考慮して30秒に設定

    it('1.2 報告書一覧取得', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/properties/prop-001/reports?limit=10',
        headers: mockAuthHeaders
      });

      expect(response.statusCode).toBe(200);
      const payload = JSON.parse(response.body);
      expect(payload.status).toBe(200);
      expect(payload.data.reports).toBeDefined();
      expect(Array.isArray(payload.data.reports)).toBe(true);
      expect(payload.data.reports.length).toBeGreaterThan(0);
      expect(payload.data.pagination).toBeDefined();
    });

    it('1.3 報告書詳細取得', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/reports/RPT-20240101-ABC',
        headers: mockAuthHeaders
      });

      expect(response.statusCode).toBe(200);
      const payload = JSON.parse(response.body);
      expect(payload.status).toBe(200);
      expect(payload.data).toBeDefined();
      expect(payload.data.id).toBe('RPT-20240101-ABC');
      expect(payload.data.client_id).toBe('client-001');
      expect(payload.data.property_id).toBe('prop-001');
    });

    it('1.4 報告書更新（下書き保存）', async () => {
      // 既存レポートの取得用モックを更新
      if (dynamoDBMock && dynamoDBMock.send) {
        dynamoDBMock.send.mockImplementationOnce(async (command: any) => {
          if (command.constructor.name === 'GetCommand') {
            return {
              Item: {
                id: 'RPT-20240101-ABC',
                client_id: 'client-001',
                property_id: 'prop-001',
                report_start_date: '2024-01-01',
                report_end_date: '2024-01-31',
                title: 'Report RPT-20240101-ABC',
                is_draft: true,
                current_status: 'draft',
                summary: 'AI生成された要約',
                price: '50000000',
                sales_start_date: '2024-01-01',
                is_suumo_published: true,
                views_count: 100,
                inquiries_count: 10,
                business_meeting_count: 5,
                viewing_count: 3,
                created_at: '2024-01-01T00:00:00Z'
              }
            };
          }
          return {};
        });
        
        // 物件情報取得用
        dynamoDBMock.send.mockImplementationOnce(async (command: any) => {
          if (command.constructor.name === 'ScanCommand') {
            return {
              Items: [{
                id: 'prop-001',
                client_id: 'client-001',
                name: 'テスト物件1',
                address: '東京都渋谷区1-1-1',
                price: '50000000',
                sales_start_date: '2024-01-01',
                is_suumo_published: true,
                views_count: 100,
                inquiries_count: 10,
                business_meeting_count: 5,
                viewing_count: 3,
                created_at: '2024-01-01T00:00:00Z'
              }]
            };
          }
          return {};
        });
        
        // 更新用
        dynamoDBMock.send.mockImplementationOnce(async () => ({
          Attributes: { updated: true }
        }));
      }

      const updateData = {
        property_id: 'prop-001',
        title: '更新されたレポート',
        report_date: '2024-01-31',
        current_status: '営業活動中',
        views_count: 120,
        inquiries_count: 15,
        save_type: 'draft'
      };

      const response = await app.inject({
        method: 'PUT',
        url: '/api/v1/properties/prop-001/reports/RPT-20240101-ABC',
        headers: mockAuthHeaders,
        payload: updateData
      });

      expect(response.statusCode).toBe(200);
      const payload = JSON.parse(response.body);
      expect(payload.status).toBe(200);
      expect(payload.message).toBe('Report saved successfully');
      expect(payload.data.result.success).toBe(true);
      expect(payload.data.result.message).toContain('draft');
    });

    it('1.5 報告書削除', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/api/v1/reports/RPT-20240101-ABC',
        headers: mockAuthHeaders
      });

      expect(response.statusCode).toBe(200);
      const payload = JSON.parse(response.body);
      expect(payload.status).toBe(200);
      expect(payload.message).toContain('deleted');
      expect(payload.data.report_id).toBe('RPT-20240101-ABC');
    });
  });

  describe('エラーシナリオ', () => {
    it('2.1 無効なデータでの報告書作成', async () => {
      const invalidData = {
        client_id: 'client-001',
        property_id: 'prop-001',
        // property_nameが欠落
        report_start_date: 'invalid-date', // 無効な日付形式
        report_end_date: '2024-01-31'
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/properties/prop-001/reports',
        headers: mockAuthHeaders,
        payload: invalidData
      });

      expect(response.statusCode).toBe(422);
      const payload = JSON.parse(response.body);
      // Fastifyのバリデーションエラーレスポンス形式
      expect(payload.message).toBeDefined();
    });

    it('2.2 存在しない物件での報告書作成', async () => {
      // 物件が見つからない場合のモック
      if (dynamoDBMock && dynamoDBMock.send) {
        dynamoDBMock.send.mockImplementationOnce(async () => ({
          Items: []
        }));
      }

      const createReportData = {
        client_id: 'client-001',
        property_id: 'prop-999',
        property_name: '存在しない物件',
        report_start_date: '2024-01-01',
        report_end_date: '2024-01-31',
        customer_interactions: [] // 空の配列を追加
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/properties/prop-999/reports',
        headers: mockAuthHeaders,
        payload: createReportData
      });

      // AI APIを実際に呼び出す場合、物件が存在しなければ500エラーが返される
      expect(response.statusCode).toBe(500);
      const payload = JSON.parse(response.body);
      expect(payload.status).toBe(500);
      expect(payload.message).toContain('Property not found');
    });

    it('2.3 存在しない報告書の取得', async () => {
      if (dynamoDBMock && dynamoDBMock.send) {
        dynamoDBMock.send.mockImplementationOnce(async () => ({
          Item: undefined
        }));
      }

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/reports/RPT-999',
        headers: mockAuthHeaders
      });

      expect(response.statusCode).toBe(500);
      const payload = JSON.parse(response.body);
      expect(payload.message).toContain('Report not found');
    });
  });
}); 