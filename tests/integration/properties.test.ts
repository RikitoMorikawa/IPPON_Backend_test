import { describe, it, expect, beforeAll, afterAll, vi, beforeEach } from 'vitest';
import { getApp } from '@src/app';
import { FastifyInstance } from 'fastify';
import { mockDynamoDBDocumentClient, mockAuthHeaders, mockUserContext } from '../mocks/mockHelpers';

// テストシナリオ
/*
  1. 成功ケース
    1.1 物件一覧取得
    1.2 物件詳細取得
    1.3 物件作成
    1.4 物件更新
    1.5 物件削除
    1.6 物件名一覧取得

  2. エラーケース
    2.1 存在しない物件の取得
    2.2 無効なデータでの物件作成
    2.3 権限なしでの物件更新
    2.4 存在しない物件の削除
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

describe('Properties API Integration Tests', () => {
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
    it('1.1 物件一覧取得', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/properties',
        headers: mockAuthHeaders
      });

      expect(response.statusCode).toBe(200);
      const payload = JSON.parse(response.body);
      expect(payload.status).toBe(200);
      expect(payload.data).toBeDefined();
      expect(Array.isArray(payload.data.properties)).toBe(true);
      expect(payload.data.properties.length).toBeGreaterThan(0);
    });

    it('1.2 物件詳細取得', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/properties/prop-001',
        headers: mockAuthHeaders
      });

      expect(response.statusCode).toBe(200);
      const payload = JSON.parse(response.body);
      expect(payload.status).toBe(200);
      expect(payload.data).toBeDefined();
      expect(payload.data.property_id).toBe('prop-001');
      expect(payload.data.property_name).toBe('テスト物件1');
    });

    it('1.3 物件作成', async () => {
      const newProperty = {
        property_name: '新規物件',
        address: '東京都品川区4-4-4',
        price: 80000000,
        description: 'テスト用新規物件'
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/properties',
        headers: mockAuthHeaders,
        payload: newProperty
      });

      expect(response.statusCode).toBe(201);
      const payload = JSON.parse(response.body);
      expect(payload.status).toBe(201);
      expect(payload.message).toContain('Property created successfully');
      expect(payload.data).toBeDefined();
      expect(payload.data.property_name).toBe(newProperty.property_name);
    });

    it('1.4 物件更新', async () => {
      const updateData = {
        property_name: '更新された物件名',
        price: 60000000
      };

      const response = await app.inject({
        method: 'PUT',
        url: '/api/v1/properties/prop-001',
        headers: mockAuthHeaders,
        payload: updateData
      });

      expect(response.statusCode).toBe(200);
      const payload = JSON.parse(response.body);
      expect(payload.status).toBe(200);
      expect(payload.message).toContain('Property updated successfully');
      expect(payload.data).toBeDefined();
    });

    it('1.5 物件削除', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/api/v1/properties/prop-001',
        headers: mockAuthHeaders
      });

      expect(response.statusCode).toBe(200);
      const payload = JSON.parse(response.body);
      expect(payload.status).toBe(200);
      expect(payload.message).toContain('Property deleted successfully');
    });

    it('1.6 物件名一覧取得', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/property-names',
        headers: mockAuthHeaders
      });

      expect(response.statusCode).toBe(200);
      const payload = JSON.parse(response.body);
      expect(payload.status).toBe(200);
      expect(payload.data).toBeDefined();
      expect(Array.isArray(payload.data)).toBe(true);
      expect(payload.data.length).toBeGreaterThan(0);
      expect(payload.data[0]).toHaveProperty('property_id');
      expect(payload.data[0]).toHaveProperty('property_name');
    });
  });

  describe('エラーシナリオ', () => {
    it('2.1 存在しない物件の取得', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/properties/prop-999',
        headers: mockAuthHeaders
      });

      expect(response.statusCode).toBe(404);
      const payload = JSON.parse(response.body);
      expect(payload.status).toBe(404);
      expect(payload.message).toContain('Property not found');
    });

    it('2.2 無効なデータでの物件作成', async () => {
      const invalidProperty = {
        // property_nameが必須項目として欠落
        address: '東京都品川区4-4-4',
        price: 'invalid-price' // 数値でなければならない
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/properties',
        headers: mockAuthHeaders,
        payload: invalidProperty
      });

      expect(response.statusCode).toBe(400);
      const payload = JSON.parse(response.body);
      expect(payload.status).toBe(400);
      expect(payload.message).toContain('Validation error');
    });

    it('2.3 認証なしでの物件更新', async () => {
      const updateData = {
        property_name: '更新された物件名'
      };

      const response = await app.inject({
        method: 'PUT',
        url: '/api/v1/properties/prop-001',
        // headersを意図的に省略
        payload: updateData
      });

      expect(response.statusCode).toBe(401);
      const payload = JSON.parse(response.body);
      expect(payload.status).toBe(401);
      expect(payload.message).toContain('Unauthorized');
    });

    it('2.4 存在しない物件の削除', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/api/v1/properties/prop-999',
        headers: mockAuthHeaders
      });

      expect(response.statusCode).toBe(404);
      const payload = JSON.parse(response.body);
      expect(payload.status).toBe(404);
      expect(payload.message).toContain('Property not found');
    });
  });
}); 