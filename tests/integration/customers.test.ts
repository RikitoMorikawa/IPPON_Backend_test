import { describe, it, expect, beforeAll, afterAll, vi, beforeEach } from 'vitest';
import { getApp } from '@src/app';
import { FastifyInstance } from 'fastify';
import { mockDynamoDBDocumentClient, mockAuthHeaders, mockUserContext } from '../mocks/mockHelpers';

// テストシナリオ
/*
  1. 成功ケース
    1.1 顧客一覧取得
    1.2 顧客詳細取得
    1.3 顧客作成
    1.4 顧客更新
    1.5 顧客削除

  2. エラーケース
    2.1 存在しない顧客の取得
    2.2 無効なデータでの顧客作成
    2.3 重複するメールアドレスでの顧客作成
    2.4 存在しない顧客の削除
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

describe('Customers API Integration Tests', () => {
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
    it('1.1 顧客一覧取得', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/customers',
        headers: mockAuthHeaders
      });

      expect(response.statusCode).toBe(200);
      const payload = JSON.parse(response.body);
      expect(payload.status).toBe(200);
      expect(payload.data).toBeDefined();
      expect(Array.isArray(payload.data.customers)).toBe(true);
      expect(payload.data.customers.length).toBeGreaterThan(0);
    });

    it('1.2 顧客詳細取得', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/customers/cust-001',
        headers: mockAuthHeaders
      });

      expect(response.statusCode).toBe(200);
      const payload = JSON.parse(response.body);
      expect(payload.status).toBe(200);
      expect(payload.data).toBeDefined();
      expect(payload.data.customer_id).toBe('cust-001');
      expect(payload.data.customer_name).toBe('テスト顧客1');
      expect(payload.data.email).toBe('customer1@test.com');
    });

    it('1.3 顧客作成（個人）', async () => {
      const newCustomer = {
        customer_type: 'individual',
        customer_name: '新規顧客',
        email: 'newcustomer@test.com',
        phone: '090-1111-2222',
        address: '東京都中央区5-5-5',
        date_of_birth: '1990-01-01'
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/customers',
        headers: mockAuthHeaders,
        payload: newCustomer
      });

      expect(response.statusCode).toBe(201);
      const payload = JSON.parse(response.body);
      expect(payload.status).toBe(201);
      expect(payload.message).toContain('Customer created successfully');
      expect(payload.data).toBeDefined();
      expect(payload.data.customer_name).toBe(newCustomer.customer_name);
      expect(payload.data.email).toBe(newCustomer.email);
    });

    it('1.4 顧客作成（法人）', async () => {
      const newCorporateCustomer = {
        customer_type: 'corporate',
        company_name: '株式会社新規顧客',
        representative_name: '代表者名',
        email: 'corporate@test.com',
        phone: '03-1111-2222',
        address: '東京都千代田区1-1-1',
        tax_id: '1234567890123'
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/customers',
        headers: mockAuthHeaders,
        payload: newCorporateCustomer
      });

      expect(response.statusCode).toBe(201);
      const payload = JSON.parse(response.body);
      expect(payload.status).toBe(201);
      expect(payload.message).toContain('Customer created successfully');
      expect(payload.data).toBeDefined();
      expect(payload.data.company_name).toBe(newCorporateCustomer.company_name);
    });

    it('1.5 顧客更新', async () => {
      const updateData = {
        customer_name: '更新された顧客名',
        phone: '090-9999-8888',
        address: '東京都港区更新1-1-1'
      };

      const response = await app.inject({
        method: 'PUT',
        url: '/api/v1/customers/cust-001',
        headers: mockAuthHeaders,
        payload: updateData
      });

      expect(response.statusCode).toBe(200);
      const payload = JSON.parse(response.body);
      expect(payload.status).toBe(200);
      expect(payload.message).toContain('Customer updated successfully');
      expect(payload.data).toBeDefined();
    });

    it('1.6 顧客削除', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/api/v1/customers/cust-001',
        headers: mockAuthHeaders
      });

      expect(response.statusCode).toBe(200);
      const payload = JSON.parse(response.body);
      expect(payload.status).toBe(200);
      expect(payload.message).toContain('Customer deleted successfully');
    });
  });

  describe('エラーシナリオ', () => {
    it('2.1 存在しない顧客の取得', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/customers/cust-999',
        headers: mockAuthHeaders
      });

      expect(response.statusCode).toBe(404);
      const payload = JSON.parse(response.body);
      expect(payload.status).toBe(404);
      expect(payload.message).toContain('Customer not found');
    });

    it('2.2 無効なデータでの顧客作成', async () => {
      const invalidCustomer = {
        customer_type: 'individual',
        // customer_nameが必須項目として欠落
        email: 'invalid-email', // 無効なメール形式
        phone: '12345' // 無効な電話番号形式
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/customers',
        headers: mockAuthHeaders,
        payload: invalidCustomer
      });

      expect(response.statusCode).toBe(400);
      const payload = JSON.parse(response.body);
      expect(payload.status).toBe(400);
      expect(payload.message).toContain('Validation error');
    });

    it('2.3 重複するメールアドレスでの顧客作成', async () => {
      const duplicateCustomer = {
        customer_type: 'individual',
        customer_name: '重複顧客',
        email: 'customer1@test.com', // 既存のメールアドレス
        phone: '090-3333-4444'
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/customers',
        headers: mockAuthHeaders,
        payload: duplicateCustomer
      });

      expect(response.statusCode).toBe(409);
      const payload = JSON.parse(response.body);
      expect(payload.status).toBe(409);
      expect(payload.message).toContain('Email already exists');
    });

    it('2.4 存在しない顧客の削除', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/api/v1/customers/cust-999',
        headers: mockAuthHeaders
      });

      expect(response.statusCode).toBe(404);
      const payload = JSON.parse(response.body);
      expect(payload.status).toBe(404);
      expect(payload.message).toContain('Customer not found');
    });

    it('2.5 認証なしでの顧客操作', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/customers',
        // headersを意図的に省略
      });

      expect(response.statusCode).toBe(401);
      const payload = JSON.parse(response.body);
      expect(payload.status).toBe(401);
      expect(payload.message).toContain('Unauthorized');
    });
  });
}); 