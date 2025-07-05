import { describe, it, expect, beforeAll, afterAll, vi, beforeEach } from 'vitest';
import { getApp } from '@src/app';
import { FastifyInstance } from 'fastify';
import { mockDynamoDBDocumentClient, mockAuthHeaders, mockUserContext } from '../mocks/mockHelpers';

// テストシナリオ
/*
  1. 成功ケース
    1.1 問い合わせ一覧取得
    1.2 問い合わせ詳細取得
    1.3 問い合わせ作成
    1.4 問い合わせ更新
    1.5 問い合わせ削除
    1.6 問い合わせ履歴一覧取得
    1.7 問い合わせ履歴詳細取得

  2. エラーケース
    2.1 存在しない問い合わせの取得
    2.2 無効なデータでの問い合わせ作成
    2.3 存在しない顧客での問い合わせ作成
    2.4 存在しない問い合わせの削除
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

describe('Inquiries API Integration Tests', () => {
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
    it('1.1 問い合わせ一覧取得', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/inquiry',
        headers: mockAuthHeaders
      });

      expect(response.statusCode).toBe(200);
      const payload = JSON.parse(response.body);
      expect(payload.status).toBe(200);
      expect(payload.data).toBeDefined();
      expect(Array.isArray(payload.data.inquiries)).toBe(true);
      expect(payload.data.inquiries.length).toBeGreaterThan(0);
    });

    it('1.2 問い合わせ詳細取得', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/inquiry/inq-001',
        headers: mockAuthHeaders
      });

      expect(response.statusCode).toBe(200);
      const payload = JSON.parse(response.body);
      expect(payload.status).toBe(200);
      expect(payload.data).toBeDefined();
      expect(payload.data.inquiry_id).toBe('inq-001');
      expect(payload.data.inquiry_type).toBe('購入希望');
      expect(payload.data.status).toBe('open');
    });

    it('1.3 問い合わせ作成', async () => {
      const newInquiry = {
        customer_id: 'cust-001',
        property_id: 'prop-001',
        inquiry_type: '内覧希望',
        inquiry_content: '週末に内覧を希望します',
        preferred_contact_method: 'email',
        preferred_contact_time: '午前中'
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/inquiry',
        headers: mockAuthHeaders,
        payload: newInquiry
      });

      expect(response.statusCode).toBe(201);
      const payload = JSON.parse(response.body);
      expect(payload.status).toBe(201);
      expect(payload.message).toContain('Inquiry created successfully');
      expect(payload.data).toBeDefined();
      expect(payload.data.customer_id).toBe(newInquiry.customer_id);
      expect(payload.data.inquiry_type).toBe(newInquiry.inquiry_type);
    });

    it('1.4 問い合わせ更新', async () => {
      const updateData = {
        status: 'in_progress',
        assigned_to: 'emp-001',
        notes: '対応開始しました'
      };

      const response = await app.inject({
        method: 'PUT',
        url: '/api/v1/inquiry/inq-001',
        headers: mockAuthHeaders,
        payload: updateData
      });

      expect(response.statusCode).toBe(200);
      const payload = JSON.parse(response.body);
      expect(payload.status).toBe(200);
      expect(payload.message).toContain('Inquiry updated successfully');
      expect(payload.data).toBeDefined();
    });

    it('1.5 問い合わせ削除', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/api/v1/inquiry/inq-001',
        headers: mockAuthHeaders
      });

      expect(response.statusCode).toBe(200);
      const payload = JSON.parse(response.body);
      expect(payload.status).toBe(200);
      expect(payload.message).toContain('Inquiry deleted successfully');
    });

    it('1.6 問い合わせ履歴一覧取得', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/inquiry-history',
        headers: mockAuthHeaders
      });

      expect(response.statusCode).toBe(200);
      const payload = JSON.parse(response.body);
      expect(payload.status).toBe(200);
      expect(payload.data).toBeDefined();
      expect(Array.isArray(payload.data.history)).toBe(true);
    });

    it('1.7 問い合わせ履歴詳細取得', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/inquiry-history/inq-001',
        headers: mockAuthHeaders
      });

      expect(response.statusCode).toBe(200);
      const payload = JSON.parse(response.body);
      expect(payload.status).toBe(200);
      expect(payload.data).toBeDefined();
      expect(payload.data.inquiry_id).toBe('inq-001');
      expect(Array.isArray(payload.data.history)).toBe(true);
    });
  });

  describe('エラーシナリオ', () => {
    it('2.1 存在しない問い合わせの取得', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/inquiry/inq-999',
        headers: mockAuthHeaders
      });

      expect(response.statusCode).toBe(404);
      const payload = JSON.parse(response.body);
      expect(payload.status).toBe(404);
      expect(payload.message).toContain('Inquiry not found');
    });

    it('2.2 無効なデータでの問い合わせ作成', async () => {
      const invalidInquiry = {
        // customer_idが必須項目として欠落
        property_id: 'prop-001',
        inquiry_type: '', // 空の問い合わせタイプ
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/inquiry',
        headers: mockAuthHeaders,
        payload: invalidInquiry
      });

      expect(response.statusCode).toBe(400);
      const payload = JSON.parse(response.body);
      expect(payload.status).toBe(400);
      expect(payload.message).toContain('Validation error');
    });

    it('2.3 存在しない顧客での問い合わせ作成', async () => {
      const inquiryWithInvalidCustomer = {
        customer_id: 'cust-999', // 存在しない顧客ID
        property_id: 'prop-001',
        inquiry_type: '購入希望',
        inquiry_content: 'テスト問い合わせ'
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/inquiry',
        headers: mockAuthHeaders,
        payload: inquiryWithInvalidCustomer
      });

      expect(response.statusCode).toBe(404);
      const payload = JSON.parse(response.body);
      expect(payload.status).toBe(404);
      expect(payload.message).toContain('Customer not found');
    });

    it('2.4 存在しない問い合わせの削除', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/api/v1/inquiry/inq-999',
        headers: mockAuthHeaders
      });

      expect(response.statusCode).toBe(404);
      const payload = JSON.parse(response.body);
      expect(payload.status).toBe(404);
      expect(payload.message).toContain('Inquiry not found');
    });

    it('2.5 認証なしでの問い合わせ操作', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/inquiry',
        // headersを意図的に省略
      });

      expect(response.statusCode).toBe(401);
      const payload = JSON.parse(response.body);
      expect(payload.status).toBe(401);
      expect(payload.message).toContain('Unauthorized');
    });

    it('2.6 無効なステータスでの問い合わせ更新', async () => {
      const invalidUpdate = {
        status: 'invalid_status' // 無効なステータス値
      };

      const response = await app.inject({
        method: 'PUT',
        url: '/api/v1/inquiry/inq-001',
        headers: mockAuthHeaders,
        payload: invalidUpdate
      });

      expect(response.statusCode).toBe(400);
      const payload = JSON.parse(response.body);
      expect(payload.status).toBe(400);
      expect(payload.message).toContain('Invalid status');
    });
  });
}); 