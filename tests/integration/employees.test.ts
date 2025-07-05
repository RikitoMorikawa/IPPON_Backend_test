import { describe, it, expect, beforeAll, afterAll, vi, beforeEach } from 'vitest';
import { getApp } from '@src/app';
import { FastifyInstance } from 'fastify';
import { mockDynamoDBDocumentClient, mockAuthHeaders, mockUserContext } from '../mocks/mockHelpers';

// テストシナリオ
/*
  1. 成功ケース
    1.1 従業員一覧取得
    1.2 従業員詳細取得
    1.3 従業員作成
    1.4 従業員更新
    1.5 従業員削除
    1.6 複数従業員削除
    1.7 従業員名一覧取得

  2. エラーケース
    2.1 存在しない従業員の取得
    2.2 無効なデータでの従業員作成
    2.3 重複するメールアドレスでの従業員作成
    2.4 存在しない従業員の削除
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
  UpdateCommand: vi.fn(),
  BatchWriteCommand: vi.fn()
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

describe('Employees API Integration Tests', () => {
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
    it('1.1 従業員一覧取得', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/employees',
        headers: mockAuthHeaders
      });

      expect(response.statusCode).toBe(200);
      const payload = JSON.parse(response.body);
      expect(payload.status).toBe(200);
      expect(payload.data).toBeDefined();
      expect(Array.isArray(payload.data.employees)).toBe(true);
      expect(payload.data.employees.length).toBeGreaterThan(0);
    });

    it('1.2 従業員詳細取得', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/employees/emp-001',
        headers: mockAuthHeaders
      });

      expect(response.statusCode).toBe(200);
      const payload = JSON.parse(response.body);
      expect(payload.status).toBe(200);
      expect(payload.data).toBeDefined();
      expect(payload.data.employee_id).toBe('emp-001');
      expect(payload.data.employee_name).toBe('テスト従業員1');
      expect(payload.data.department).toBe('営業部');
    });

    it('1.3 従業員作成', async () => {
      const newEmployee = {
        employee_name: '新規従業員',
        email: 'newemployee@test.com',
        department: '開発部',
        position: 'エンジニア',
        phone: '090-5555-6666',
        hire_date: '2024-01-01'
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/employees',
        headers: mockAuthHeaders,
        payload: newEmployee
      });

      expect(response.statusCode).toBe(201);
      const payload = JSON.parse(response.body);
      expect(payload.status).toBe(201);
      expect(payload.message).toContain('Employee created successfully');
      expect(payload.data).toBeDefined();
      expect(payload.data.employee_name).toBe(newEmployee.employee_name);
      expect(payload.data.department).toBe(newEmployee.department);
    });

    it('1.4 従業員更新', async () => {
      const updateData = {
        employee_name: '更新された従業員名',
        department: '管理部',
        position: 'マネージャー'
      };

      const response = await app.inject({
        method: 'PUT',
        url: '/api/v1/employees/emp-001',
        headers: mockAuthHeaders,
        payload: updateData
      });

      expect(response.statusCode).toBe(200);
      const payload = JSON.parse(response.body);
      expect(payload.status).toBe(200);
      expect(payload.message).toContain('Employee updated successfully');
      expect(payload.data).toBeDefined();
    });

    it('1.5 従業員削除', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/api/v1/employees/emp-001',
        headers: mockAuthHeaders
      });

      expect(response.statusCode).toBe(200);
      const payload = JSON.parse(response.body);
      expect(payload.status).toBe(200);
      expect(payload.message).toContain('Employee deleted successfully');
    });

    it('1.6 複数従業員削除', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/api/v1/employees/multiple-delete',
        headers: mockAuthHeaders,
        payload: {
          employee_ids: ['emp-001', 'emp-002']
        }
      });

      expect(response.statusCode).toBe(200);
      const payload = JSON.parse(response.body);
      expect(payload.status).toBe(200);
      expect(payload.message).toContain('Employees deleted successfully');
      expect(payload.data.deleted_count).toBe(2);
    });

    it('1.7 従業員名一覧取得', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/employees/names-list',
        headers: mockAuthHeaders
      });

      expect(response.statusCode).toBe(200);
      const payload = JSON.parse(response.body);
      expect(payload.status).toBe(200);
      expect(payload.data).toBeDefined();
      expect(Array.isArray(payload.data)).toBe(true);
      expect(payload.data.length).toBeGreaterThan(0);
      expect(payload.data[0]).toHaveProperty('employee_id');
      expect(payload.data[0]).toHaveProperty('employee_name');
    });
  });

  describe('エラーシナリオ', () => {
    it('2.1 存在しない従業員の取得', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/employees/emp-999',
        headers: mockAuthHeaders
      });

      expect(response.statusCode).toBe(404);
      const payload = JSON.parse(response.body);
      expect(payload.status).toBe(404);
      expect(payload.message).toContain('Employee not found');
    });

    it('2.2 無効なデータでの従業員作成', async () => {
      const invalidEmployee = {
        // employee_nameが必須項目として欠落
        email: 'invalid-email', // 無効なメール形式
        department: '', // 空の部署
        phone: '12345' // 無効な電話番号形式
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/employees',
        headers: mockAuthHeaders,
        payload: invalidEmployee
      });

      expect(response.statusCode).toBe(400);
      const payload = JSON.parse(response.body);
      expect(payload.status).toBe(400);
      expect(payload.message).toContain('Validation error');
    });

    it('2.3 重複するメールアドレスでの従業員作成', async () => {
      const duplicateEmployee = {
        employee_name: '重複従業員',
        email: 'employee1@test.com', // 既存のメールアドレス
        department: '営業部',
        phone: '090-7777-8888'
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/employees',
        headers: mockAuthHeaders,
        payload: duplicateEmployee
      });

      expect(response.statusCode).toBe(409);
      const payload = JSON.parse(response.body);
      expect(payload.status).toBe(409);
      expect(payload.message).toContain('Email already exists');
    });

    it('2.4 存在しない従業員の削除', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/api/v1/employees/emp-999',
        headers: mockAuthHeaders
      });

      expect(response.statusCode).toBe(404);
      const payload = JSON.parse(response.body);
      expect(payload.status).toBe(404);
      expect(payload.message).toContain('Employee not found');
    });

    it('2.5 認証なしでの従業員操作', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/employees',
        // headersを意図的に省略
      });

      expect(response.statusCode).toBe(401);
      const payload = JSON.parse(response.body);
      expect(payload.status).toBe(401);
      expect(payload.message).toContain('Unauthorized');
    });

    it('2.6 空の配列での複数削除', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/api/v1/employees/multiple-delete',
        headers: mockAuthHeaders,
        payload: {
          employee_ids: []
        }
      });

      expect(response.statusCode).toBe(400);
      const payload = JSON.parse(response.body);
      expect(payload.status).toBe(400);
      expect(payload.message).toContain('No employee IDs provided');
    });
  });
}); 