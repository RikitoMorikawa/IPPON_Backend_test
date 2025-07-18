import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { getApp } from '@src/app';
import { FastifyInstance } from 'fastify';
import { MOCK_DATA, mockAuthHeaders } from '../setup';

// 基本的なCustomer APIテスト - シンプルなCRUD操作のみ
/*
  1. 成功ケース
    1.1 顧客一覧取得 - GET /api/v1/customers
    1.2 個人顧客詳細取得 - GET /api/v1/customers/:id
    1.3 法人顧客詳細取得 - GET /api/v1/customers/:id
    1.4 個人顧客作成 - POST /api/v1/customers
    1.5 法人顧客作成 - POST /api/v1/customers
    1.6 個人顧客更新 - PUT /api/v1/customers/:id
    1.7 法人顧客更新 - PUT /api/v1/customers/:id
    1.8 顧客削除 - DELETE /api/v1/customers/:id

  2. エラーケース
    2.1 存在しない顧客の取得
    2.2 無効なデータでの顧客作成
    2.3 存在しない顧客の更新
    2.4 存在しない顧客の削除
    2.5 認証なしでの顧客操作
*/

describe('👥 Customer API Integration Tests', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await getApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    // Setup.tsのbeforeEachで自動的にモックがリセットされます
  });

  describe('🔍 GET /api/v1/customers - 顧客一覧取得', () => {
    it('✅ 顧客一覧を取得できる', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/customers',
        headers: {
          authorization: 'Bearer mock-jwt-token',
          'content-type': 'application/json'
        }
      });

      expect(response.statusCode).toBe(200);
      
      const responseBody = JSON.parse(response.body);
      expect(responseBody.status).toBe(200);
      expect(responseBody.data).toHaveProperty('total');
      expect(responseBody.data).toHaveProperty('page');
      expect(responseBody.data).toHaveProperty('limit');
      expect(responseBody.data).toHaveProperty('items');
      expect(responseBody.data.items).toBeInstanceOf(Array);
    });
  });

  describe('🔍 GET /api/v1/customers/:id - 顧客詳細取得', () => {
    it('✅ 個人顧客詳細を取得できる', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/customers/customer-1',
        headers: {
          authorization: 'Bearer mock-jwt-token',
          'content-type': 'application/json'
        }
      });

      expect(response.statusCode).toBe(200);
      
      const responseBody = JSON.parse(response.body);
      expect(responseBody.status).toBe(200);
      expect(responseBody.data).toHaveProperty('customer');
      expect(responseBody.data.customer).toHaveProperty('id');
      expect(responseBody.data.customer).toHaveProperty('customer_type');
      // 個人顧客の場合は individual_customer_details がある
      if (responseBody.data.customer.customer_type.includes('individual')) {
        expect(responseBody.data.customer).toHaveProperty('individual_customer_details');
      }
    });

    it('✅ 法人顧客詳細を取得できる', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/customers/customer-2',
        headers: {
          authorization: 'Bearer mock-jwt-token',
          'content-type': 'application/json'
        }
      });

      expect(response.statusCode).toBe(200);
      
      const responseBody = JSON.parse(response.body);
      expect(responseBody.status).toBe(200);
      expect(responseBody.data).toHaveProperty('customer');
      expect(responseBody.data.customer).toHaveProperty('id');
      expect(responseBody.data.customer).toHaveProperty('customer_type');
      // 法人顧客の場合は corporate_customer_details がある
      if (responseBody.data.customer.customer_type.includes('corporate')) {
        expect(responseBody.data.customer).toHaveProperty('corporate_customer_details');
      }
    });
  });

  describe('📝 POST /api/v1/customers - 顧客作成', () => {
    it('✅ 個人顧客を作成できる', async () => {
      const customerData = {
        customer_type: 'individual',
        individual_customer_details: {
          customer_name: '新規 太郎',
          email: 'new-customer@test.com',
          phone: '090-9999-8888',
          address: '東京都新宿区1-1-1',
          date_of_birth: '1990-01-01',
          occupation: 'エンジニア',
          annual_income: 6000000,
          family_composition: '単身',
          remarks: '新規作成テスト'
        }
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/customers',
        headers: {
          authorization: 'Bearer mock-jwt-token',
          'content-type': 'application/json'
        },
        body: JSON.stringify(customerData)
      });

      expect(response.statusCode).toBe(201);
      
      const responseBody = JSON.parse(response.body);
      expect(responseBody.status).toBe(201);
      expect(responseBody.data).toHaveProperty('customer');
      expect(responseBody.data.customer).toHaveProperty('id');
    });

    it('✅ 法人顧客を作成できる', async () => {
      const customerData = {
        customer_type: 'corporate',
        corporate_customer_details: {
          company_name: '新規株式会社',
          representative_name: '代表 次郎',
          email: 'corp-new@test.com',
          phone: '03-9999-8888',
          address: '東京都港区2-2-2',
          business_type: 'IT関連',
          capital: 50000000,
          employees: 100,
          remarks: '法人新規作成テスト'
        }
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/customers',
        headers: {
          authorization: 'Bearer mock-jwt-token',
          'content-type': 'application/json'
        },
        body: JSON.stringify(customerData)
      });

      expect(response.statusCode).toBe(201);
      
      const responseBody = JSON.parse(response.body);
      expect(responseBody.status).toBe(201);
      expect(responseBody.data).toHaveProperty('customer');
      expect(responseBody.data.customer).toHaveProperty('id');
    });
  });

  describe('✏️ PUT /api/v1/customers/:id - 顧客更新', () => {
    it('✅ 個人顧客を更新できる', async () => {
      const updateData = {
        client_id: 'client-001',
        customer_id: 'customer-1',
        customer_created_at: '2024-01-01T00:00:00.000Z',
        customer_type: 'individual',
        individual_customer_details: {
          customer_name: '更新 太郎',
          email: 'updated@test.com',
          phone: '090-1111-2222',
          address: '東京都渋谷区更新1-1-1',
          date_of_birth: '1985-05-15',
          occupation: '更新エンジニア',
          annual_income: 9000000,
          family_composition: '夫婦',
          remarks: '更新テスト'
        }
      };

      const response = await app.inject({
        method: 'PUT',
        url: '/api/v1/customers/customer-1',
        headers: {
          authorization: 'Bearer mock-jwt-token',
          'content-type': 'application/json'
        },
        body: JSON.stringify(updateData)
      });

      expect(response.statusCode).toBe(200);
      
      const responseBody = JSON.parse(response.body);
      expect(responseBody.status).toBe(200);
      // PUT操作は更新結果を返す
      expect(responseBody.data).toBeDefined();
    });

    it('✅ 法人顧客を更新できる', async () => {
      const updateData = {
        client_id: 'client-001',
        customer_id: 'customer-2',
        customer_created_at: '2024-01-02T00:00:00.000Z',
        customer_type: 'corporate',
        corporate_customer_details: {
          company_name: '更新株式会社',
          representative_name: '更新 代表',
          email: 'updated-corp@test.com',
          phone: '03-1111-2222',
          address: '東京都中央区更新2-2-2',
          business_type: '更新IT関連',
          capital: 100000000,
          employees: 200,
          remarks: '法人更新テスト'
        }
      };

      const response = await app.inject({
        method: 'PUT',
        url: '/api/v1/customers/customer-2',
        headers: {
          authorization: 'Bearer mock-jwt-token',
          'content-type': 'application/json'
        },
        body: JSON.stringify(updateData)
      });

      expect(response.statusCode).toBe(200);
      
      const responseBody = JSON.parse(response.body);
      expect(responseBody.status).toBe(200);
      // PUT操作は更新結果を返す
      expect(responseBody.data).toBeDefined();
    });
  });

  describe('🗑️ DELETE /api/v1/customers/:id - 顧客削除', () => {
    it('✅ 顧客を削除できる', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/api/v1/customers/customer-1',
        headers: {
          authorization: 'Bearer mock-jwt-token',
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          customer_ids: ['customer-1']
        })
      });

      expect(response.statusCode).toBe(200);
      
      const responseBody = JSON.parse(response.body);
      expect(responseBody.status).toBe(200);
    });
  });

  describe('❌ エラーケース', () => {
    it('❌ 存在しない顧客の取得', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/customers/non-existent-id',
        headers: {
          authorization: 'Bearer mock-jwt-token',
          'content-type': 'application/json'
        }
      });

      expect(response.statusCode).toBe(404);
    });

    it('❌ 無効なデータでの顧客作成', async () => {
      const invalidData = {
        customer_type: 'individual',
        // 必須フィールドが不足
        individual_customer_details: {
          customer_name: ''
        }
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/customers',
        headers: {
          authorization: 'Bearer mock-jwt-token',
          'content-type': 'application/json'
        },
        body: JSON.stringify(invalidData)
      });

      expect(response.statusCode).toBe(400);
    });

    it('❌ 存在しない顧客の更新', async () => {
      const updateData = {
        client_id: 'client-001',
        customer_id: 'non-existent-id',
        customer_created_at: '2024-01-01T00:00:00.000Z',
        customer_type: 'individual',
        individual_customer_details: {
          customer_name: 'テスト更新',
          email: 'test@example.com',
          phone: '090-1234-5678',
          address: 'テスト住所',
          date_of_birth: '1990-01-01',
          occupation: 'テスト職業',
          annual_income: 5000000,
          family_composition: '単身'
        }
      };

      const response = await app.inject({
        method: 'PUT',
        url: '/api/v1/customers/non-existent-id',
        headers: {
          authorization: 'Bearer mock-jwt-token',
          'content-type': 'application/json'
        },
        body: JSON.stringify(updateData)
      });

      expect(response.statusCode).toBe(404);
    });

    it('❌ 存在しない顧客の削除', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/api/v1/customers/non-existent-id',
        headers: {
          authorization: 'Bearer mock-jwt-token',
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          customer_ids: ['non-existent-id']
        })
      });

      expect(response.statusCode).toBe(404);
    });

    it('❌ 認証なしでの顧客操作', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/customers',
        headers: {
          'content-type': 'application/json'
          // authorization ヘッダーなし
        }
      });

      expect(response.statusCode).toBe(401);
    });
  });
}); 