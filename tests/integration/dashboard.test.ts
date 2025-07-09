import { describe, it, expect, beforeAll, afterAll, vi, beforeEach } from 'vitest';
import { getApp } from '@src/app';
import { FastifyInstance } from 'fastify';
import { mockDynamoDBDocumentClient, mockAuthHeaders, mockUserContext, mockDynamoDBData } from '../mocks/mockHelpers';

// テストシナリオ
/*
  1. 成功ケース
    1.1 ダッシュボードデータ取得（全体）
    1.2 ダッシュボードデータ取得（特定顧客）
    1.3 統計情報付きダッシュボードデータ取得

  2. エラーケース
    2.1 存在しない個人顧客IDでのダッシュボード取得
    2.2 認証なしでのダッシュボード取得
*/

// DynamoDBモック設定
vi.mock('@aws-sdk/lib-dynamodb', () => ({
  DynamoDBDocumentClient: {
    from: vi.fn().mockReturnValue(mockDynamoDBDocumentClient())
  },
  GetCommand: vi.fn(),
  PutCommand: vi.fn(),
  QueryCommand: vi.fn(),
  DeleteCommand: vi.fn(),
  UpdateCommand: vi.fn()
}));

// Cognitoミドルウェアモック
vi.mock('@src/middleware/middleware', () => ({
  cognitoAuthMiddleware: vi.fn().mockImplementation((req, reply, done) => {
    req.userEmail = mockUserContext.email;
    req.userGroup = mockUserContext.group;
    req.user = mockUserContext;
    done();
  })
}));

describe('Dashboard API Integration Tests', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
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
    it('1.1 ダッシュボードデータ取得（全体）', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/dashboard',
        headers: mockAuthHeaders
      });

      expect(response.statusCode).toBe(200);
      const payload = JSON.parse(response.body);
      expect(payload.status).toBe(200);
      expect(payload.data).toBeDefined();
      
      // ダッシュボードのサマリーデータを確認
      expect(payload.data.summary).toBeDefined();
      expect(payload.data.summary.total_properties).toBeGreaterThan(0);
      expect(payload.data.summary.total_customers).toBeGreaterThan(0);
      expect(payload.data.summary.total_inquiries).toBeGreaterThan(0);
      expect(payload.data.summary.active_inquiries).toBeGreaterThanOrEqual(0);
      
      // 最近の活動を確認
      expect(payload.data.recent_activities).toBeDefined();
      expect(Array.isArray(payload.data.recent_activities)).toBe(true);
      
      // 物件ステータスを確認
      expect(payload.data.property_status).toBeDefined();
      expect(payload.data.property_status).toHaveProperty('available');
      expect(payload.data.property_status).toHaveProperty('sold');
      expect(payload.data.property_status).toHaveProperty('reserved');
    });

    it('1.2 ダッシュボードデータ取得（特定顧客）', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/dashboard/cust-001',
        headers: mockAuthHeaders
      });

      expect(response.statusCode).toBe(200);
      const payload = JSON.parse(response.body);
      expect(payload.status).toBe(200);
      expect(payload.data).toBeDefined();
      
      // 顧客固有のダッシュボードデータを確認
      expect(payload.data.customer_info).toBeDefined();
      expect(payload.data.customer_info.customer_id).toBe('cust-001');
      expect(payload.data.customer_info.customer_name).toBe('テスト顧客1');
      
      // 顧客の問い合わせ履歴
      expect(payload.data.inquiry_history).toBeDefined();
      expect(Array.isArray(payload.data.inquiry_history)).toBe(true);
      
      // 顧客の興味のある物件
      expect(payload.data.interested_properties).toBeDefined();
      expect(Array.isArray(payload.data.interested_properties)).toBe(true);
    });

    it('1.3 統計情報付きダッシュボードデータ取得', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/dashboard?include_stats=true',
        headers: mockAuthHeaders
      });

      expect(response.statusCode).toBe(200);
      const payload = JSON.parse(response.body);
      expect(payload.status).toBe(200);
      expect(payload.data).toBeDefined();
      
      // 統計情報を確認
      expect(payload.data.statistics).toBeDefined();
      expect(payload.data.statistics.monthly_inquiries).toBeDefined();
      expect(payload.data.statistics.property_price_range).toBeDefined();
      expect(payload.data.statistics.customer_demographics).toBeDefined();
      
      // グラフデータを確認
      expect(payload.data.chart_data).toBeDefined();
      expect(payload.data.chart_data.inquiry_trends).toBeDefined();
      expect(Array.isArray(payload.data.chart_data.inquiry_trends)).toBe(true);
    });

    it('1.4 期間指定でのダッシュボードデータ取得', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/dashboard?start_date=2024-01-01&end_date=2024-01-31',
        headers: mockAuthHeaders
      });

      expect(response.statusCode).toBe(200);
      const payload = JSON.parse(response.body);
      expect(payload.status).toBe(200);
      expect(payload.data).toBeDefined();
      
      // 期間内のデータのみが含まれていることを確認
      expect(payload.data.period).toBeDefined();
      expect(payload.data.period.start_date).toBe('2024-01-01');
      expect(payload.data.period.end_date).toBe('2024-01-31');
      
      // 期間内のサマリー
      expect(payload.data.period_summary).toBeDefined();
      expect(payload.data.period_summary.inquiries_in_period).toBeGreaterThanOrEqual(0);
      expect(payload.data.period_summary.new_customers_in_period).toBeGreaterThanOrEqual(0);
    });
  });

  describe('エラーシナリオ', () => {
    it('2.1 存在しない個人顧客IDでのダッシュボード取得', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/dashboard/cust-999',
        headers: mockAuthHeaders
      });

      expect(response.statusCode).toBe(404);
      const payload = JSON.parse(response.body);
      expect(payload.status).toBe(404);
      expect(payload.message).toContain('Customer not found');
    });

    it('2.2 認証なしでのダッシュボード取得', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/dashboard',
        // headersを意図的に省略
      });

      expect(response.statusCode).toBe(401);
      const payload = JSON.parse(response.body);
      expect(payload.status).toBe(401);
      expect(payload.message).toContain('Unauthorized');
    });

    it('2.3 無効な期間指定でのダッシュボード取得', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/dashboard?start_date=2024-01-31&end_date=2024-01-01', // 開始日が終了日より後
        headers: mockAuthHeaders
      });

      expect(response.statusCode).toBe(400);
      const payload = JSON.parse(response.body);
      expect(payload.status).toBe(400);
      expect(payload.message).toContain('Invalid date range');
    });

    it('2.4 無効な日付形式でのダッシュボード取得', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/dashboard?start_date=invalid-date',
        headers: mockAuthHeaders
      });

      expect(response.statusCode).toBe(400);
      const payload = JSON.parse(response.body);
      expect(payload.status).toBe(400);
      expect(payload.message).toContain('Invalid date format');
    });
  });
}); 