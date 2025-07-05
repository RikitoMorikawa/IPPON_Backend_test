import { describe, it, expect, beforeAll, afterAll, vi, beforeEach } from 'vitest';
import { getApp } from '@src/app';
import { FastifyInstance } from 'fastify';
import { mockAuthHeaders } from '../setup';

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
  const mockData = {
    clients: [
      {
        client_id: 'client-001',
        client_name: 'テストクライアント1',
        company_name: '株式会社テスト',
        email: 'client1@test.com',
        phone: '03-1234-5678',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }
    ]
  };

  return {
    DynamoDBDocumentClient: {
      from: vi.fn().mockImplementation(() => ({
        send: vi.fn().mockImplementation(async (command) => {
          const commandName = command.constructor.name;
          
          if (commandName === 'GetCommand') {
            const clientId = command.input.Key?.client_id;
            if (clientId === 'client-001') {
              return { Item: mockData.clients[0] };
            }
            return { Item: undefined };
          }
          
          if (commandName === 'QueryCommand') {
            return { Items: mockData.clients, Count: mockData.clients.length };
          }
          
          if (commandName === 'PutCommand') {
            return { Attributes: command.input.Item };
          }
          
          if (commandName === 'UpdateCommand') {
            return { Attributes: { ...command.input.Key, updated: true } };
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
    UpdateCommand: vi.fn()
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
      client_id: 'client-001'
    };
    done();
  })
}));

// テストシナリオ
/*
  1. 成功ケース
    1.1 クライアント一覧取得
    1.2 クライアント詳細取得
    1.3 クライアント作成
    1.4 クライアント更新
    1.5 クライアント削除

  2. エラーケース
    2.1 存在しないクライアントの取得
    2.2 無効なデータでのクライアント作成
    2.3 重複するメールアドレスでのクライアント作成
    2.4 存在しないクライアントの削除
*/

describe('Clients API Integration Tests', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    // DynamoDBのモックレスポンスをカスタマイズ
    const { DynamoDBDocumentClient } = await import('@aws-sdk/lib-dynamodb');
    const mockClients = [
      {
        client_id: 'client-001',
        client_name: 'テストクライアント1',
        company_name: '株式会社テスト',
        email: 'client1@test.com',
        phone: '03-1234-5678',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }
    ];

    const mockSend = vi.fn().mockImplementation(async (command) => {
      const commandName = command.constructor.name;
      
      if (commandName === 'GetCommand') {
        const clientId = command.input.Key?.client_id;
        if (clientId === 'client-001') {
          return { Item: mockClients[0] };
        }
        return { Item: undefined };
      }
      
      if (commandName === 'QueryCommand') {
        return { Items: mockClients, Count: mockClients.length };
      }
      
      if (commandName === 'PutCommand') {
        return { Attributes: command.input.Item };
      }
      
      if (commandName === 'UpdateCommand') {
        return { Attributes: { ...command.input.Key, updated: true } };
      }
      
      if (commandName === 'DeleteCommand') {
        return { Attributes: command.input.Key };
      }
      
      return {};
    });

    // モックを設定
    (DynamoDBDocumentClient.from as any).mockReturnValue({
      send: mockSend
    });

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
    it('1.1 クライアント一覧取得', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/clients',
        headers: mockAuthHeaders
      });

      expect(response.statusCode).toBe(200);
      const payload = JSON.parse(response.body);
      expect(payload.status).toBe(200);
      expect(payload.data).toBeDefined();
      expect(Array.isArray(payload.data.clients)).toBe(true);
      expect(payload.data.clients.length).toBeGreaterThan(0);
      expect(payload.data.clients[0]).toHaveProperty('client_id');
      expect(payload.data.clients[0]).toHaveProperty('company_name');
    });

    it('1.2 クライアント詳細取得', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/clients/client-001',
        headers: mockAuthHeaders
      });

      expect(response.statusCode).toBe(200);
      const payload = JSON.parse(response.body);
      expect(payload.status).toBe(200);
      expect(payload.data).toBeDefined();
      expect(payload.data.client_id).toBe('client-001');
      expect(payload.data.client_name).toBe('テストクライアント1');
      expect(payload.data.company_name).toBe('株式会社テスト');
      expect(payload.data.email).toBe('client1@test.com');
    });

    it('1.3 クライアント作成', async () => {
      const newClient = {
        client_name: '新規クライアント',
        company_name: '株式会社新規',
        email: 'newclient@test.com',
        phone: '03-3333-4444',
        address: '東京都品川区5-5-5',
        industry: '不動産業',
        contact_person: '担当者名'
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/clients',
        headers: mockAuthHeaders,
        payload: newClient
      });

      expect(response.statusCode).toBe(201);
      const payload = JSON.parse(response.body);
      expect(payload.status).toBe(201);
      expect(payload.message).toContain('Client created successfully');
      expect(payload.data).toBeDefined();
      expect(payload.data.client_name).toBe(newClient.client_name);
      expect(payload.data.company_name).toBe(newClient.company_name);
    });

    it('1.4 クライアント更新', async () => {
      const updateData = {
        client_name: '更新されたクライアント名',
        phone: '03-9999-8888',
        address: '東京都千代田区更新1-1-1',
        contact_person: '新担当者'
      };

      const response = await app.inject({
        method: 'PUT',
        url: '/api/v1/clients/client-001',
        headers: mockAuthHeaders,
        payload: updateData
      });

      expect(response.statusCode).toBe(200);
      const payload = JSON.parse(response.body);
      expect(payload.status).toBe(200);
      expect(payload.message).toContain('Client updated successfully');
      expect(payload.data).toBeDefined();
    });

    it('1.5 クライアント削除', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/api/v1/clients/client-001',
        headers: mockAuthHeaders
      });

      expect(response.statusCode).toBe(200);
      const payload = JSON.parse(response.body);
      expect(payload.status).toBe(200);
      expect(payload.message).toContain('Client deleted successfully');
    });
  });

  describe('エラーシナリオ', () => {
    it('2.1 存在しないクライアントの取得', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/clients/client-999',
        headers: mockAuthHeaders
      });

      expect(response.statusCode).toBe(404);
      const payload = JSON.parse(response.body);
      expect(payload.status).toBe(404);
      expect(payload.message).toContain('Client not found');
    });

    it('2.2 無効なデータでのクライアント作成', async () => {
      const invalidClient = {
        // client_nameが必須項目として欠落
        company_name: '株式会社無効',
        email: 'invalid-email', // 無効なメール形式
        phone: '12345' // 無効な電話番号形式
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/clients',
        headers: mockAuthHeaders,
        payload: invalidClient
      });

      expect(response.statusCode).toBe(400);
      const payload = JSON.parse(response.body);
      expect(payload.status).toBe(400);
      expect(payload.message).toContain('Validation error');
    });

    it('2.3 重複するメールアドレスでのクライアント作成', async () => {
      const duplicateClient = {
        client_name: '重複クライアント',
        company_name: '株式会社重複',
        email: 'client1@test.com', // 既存のメールアドレス
        phone: '03-5555-6666'
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/clients',
        headers: mockAuthHeaders,
        payload: duplicateClient
      });

      expect(response.statusCode).toBe(409);
      const payload = JSON.parse(response.body);
      expect(payload.status).toBe(409);
      expect(payload.message).toContain('Email already exists');
    });

    it('2.4 存在しないクライアントの削除', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/api/v1/clients/client-999',
        headers: mockAuthHeaders
      });

      expect(response.statusCode).toBe(404);
      const payload = JSON.parse(response.body);
      expect(payload.status).toBe(404);
      expect(payload.message).toContain('Client not found');
    });

    it('2.5 認証なしでのクライアント操作', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/clients',
        // headersを意図的に省略
      });

      expect(response.statusCode).toBe(401);
      const payload = JSON.parse(response.body);
      expect(payload.status).toBe(401);
      expect(payload.message).toContain('Unauthorized');
    });

    it('2.6 不正なフィールドでのクライアント更新', async () => {
      const invalidUpdate = {
        client_id: 'should-not-be-updated', // IDは更新できない
        invalid_field: 'invalid_value' // 存在しないフィールド
      };

      const response = await app.inject({
        method: 'PUT',
        url: '/api/v1/clients/client-001',
        headers: mockAuthHeaders,
        payload: invalidUpdate
      });

      expect(response.statusCode).toBe(400);
      const payload = JSON.parse(response.body);
      expect(payload.status).toBe(400);
      expect(payload.message).toContain('Invalid update fields');
    });
  });
}); 