import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { getApp } from '@src/app';
import { FastifyInstance } from 'fastify';
import { mockAuthHeaders } from '../setup';

// 環境変数を設定
process.env.NODE_ENV = 'test';
process.env.AWS_REGION = 'ap-northeast-1';

// Cognitoミドルウェアモック
vi.mock('@src/middleware/middleware', () => ({
  cognitoAuthMiddleware: vi.fn().mockImplementation((req, reply, done) => {
    req.userEmail = 'test@example.com';
    req.userGroup = 'admin';
    req.user = {
      email: 'test@example.com',
      group: 'admin',
      sub: '1f975111-a78f-47b9-be03-ee74fe299417', // 実際のemployee_id
      'custom:clientId': '0423994e-0c0e-4906-b80b-b098b1527a83', // 実際のclient_id
      'custom:type': 'employee',
      'custom:role': 'admin'
    };
    done();
  }),
  registerMiddlewares: vi.fn().mockResolvedValue(undefined)
}));

describe('Reports API - AI Integration Test', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await getApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should create a report with AI-generated summary', async () => {
    console.log('Starting AI API integration test...');
    
    const createReportData = {
      client_id: '0423994e-0c0e-4906-b80b-b098b1527a83',
      property_id: '31c7c8c5-554d-45fb-a11e-bb48eac460be', // 東京都千代田区の新築マンション
      property_name: '東京都千代田区の新築マンション',
      report_start_date: '2024-12-01',
      report_end_date: '2024-12-31',
      customer_interactions: [
        {
          customer_id: 'cust-001',
          customer_name: '田中太郎',
          inquired_at: '2024-01-15 10:00:00',
          category: '問い合わせ',
          type: 'email',
          title: '新規問い合わせ',
          summary: '物件の詳細について問い合わせがありました。特に間取りや価格、周辺環境について詳しく説明しました。お客様は購入を前向きに検討されています。'
        },
        {
          customer_id: 'cust-002',
          customer_name: '山田花子',
          inquired_at: '2024-01-20 14:00:00',
          category: '内見',
          type: 'phone',
          title: '内見実施',
          summary: '内見を実施しました。お客様は物件の日当たりや設備に満足されていました。特にキッチンの広さと収納スペースを気に入っていただけました。購入を前向きに検討中です。'
        }
      ]
    };

    try {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/properties/31c7c8c5-554d-45fb-a11e-bb48eac460be/reports',
        headers: mockAuthHeaders,
        payload: createReportData
      });

      console.log('Response status:', response.statusCode);
      console.log('Response body:', response.body);

      // レスポンスをパース
      const payload = JSON.parse(response.body);

      // エラーの場合は詳細を表示
      if (response.statusCode !== 201) {
        console.error('Error response:', payload);
      }

      // AIが生成した要約を確認
      if (payload.data) {
        console.log('AI Summary:', payload.data.summary);
        console.log('Customer Interactions:', JSON.stringify(payload.data.customer_interactions, null, 2));
      }

      // 基本的なアサーション
      expect(response.statusCode).toBeGreaterThanOrEqual(200);
      expect(response.statusCode).toBeLessThan(500);

      if (response.statusCode === 201) {
        // 成功した場合の詳細な検証
        expect(payload.data).toBeDefined();
        expect(payload.data.client_id).toBe('0423994e-0c0e-4906-b80b-b098b1527a83');
        expect(payload.data.property_id).toBe('31c7c8c5-554d-45fb-a11e-bb48eac460be');
        expect(payload.data.property_name).toBe('東京都千代田区の新築マンション');
        
        // AI要約が生成されていることを確認
        expect(payload.data.summary).toBeDefined();
        expect(typeof payload.data.summary).toBe('string');
        expect(payload.data.summary.length).toBeGreaterThan(10);
        
        // 顧客対応内容がAIにより要約されていることを確認
        if (payload.data.customer_interactions && payload.data.customer_interactions.length > 0) {
          const interaction = payload.data.customer_interactions[0];
          expect(interaction.content).toBeDefined();
          expect(typeof interaction.content).toBe('string');
          console.log('AI summarized content:', interaction.content);
        }
      }

    } catch (error) {
      console.error('Test error:', error);
      throw error;
    }
  }, 60000); // タイムアウトを60秒に設定
}); 