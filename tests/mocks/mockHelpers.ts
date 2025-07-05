import { vi } from 'vitest';
import { DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand, DeleteCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

// DynamoDB モックデータ
export const mockDynamoDBData = {
  clients: [
    {
      client_id: 'client-001',
      client_name: 'テストクライアント1',
      company_name: '株式会社テスト',
      email: 'client1@test.com',
      phone: '03-1234-5678',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    },
    {
      client_id: 'client-002',
      client_name: 'テストクライアント2',
      company_name: '株式会社サンプル',
      email: 'client2@test.com',
      phone: '03-9876-5432',
      created_at: '2024-01-02T00:00:00Z',
      updated_at: '2024-01-02T00:00:00Z'
    }
  ],
  properties: [
    {
      property_id: 'prop-001',
      client_id: 'client-001',
      property_name: 'テスト物件1',
      address: '東京都渋谷区1-1-1',
      price: 50000000,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    },
    {
      property_id: 'prop-002',
      client_id: 'client-001',
      property_name: 'テスト物件2',
      address: '東京都新宿区2-2-2',
      price: 75000000,
      created_at: '2024-01-02T00:00:00Z',
      updated_at: '2024-01-02T00:00:00Z'
    },
    {
      property_id: 'prop-003',
      client_id: 'client-002',
      property_name: 'テスト物件3',
      address: '東京都港区3-3-3',
      price: 100000000,
      created_at: '2024-01-03T00:00:00Z',
      updated_at: '2024-01-03T00:00:00Z'
    }
  ],
  customers: [
    {
      customer_id: 'cust-001',
      client_id: 'client-001',
      customer_name: 'テスト顧客1',
      email: 'customer1@test.com',
      phone: '090-1234-5678',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    },
    {
      customer_id: 'cust-002',
      client_id: 'client-001',
      customer_name: 'テスト顧客2',
      email: 'customer2@test.com',
      phone: '090-9876-5432',
      created_at: '2024-01-02T00:00:00Z',
      updated_at: '2024-01-02T00:00:00Z'
    }
  ],
  employees: [
    {
      employee_id: 'emp-001',
      client_id: 'client-001',
      employee_name: 'テスト従業員1',
      email: 'employee1@test.com',
      department: '営業部',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    },
    {
      employee_id: 'emp-002',
      client_id: 'client-001',
      employee_name: 'テスト従業員2',
      email: 'employee2@test.com',
      department: '管理部',
      created_at: '2024-01-02T00:00:00Z',
      updated_at: '2024-01-02T00:00:00Z'
    }
  ],
  inquiries: [
    {
      inquiry_id: 'inq-001',
      client_id: 'client-001',
      customer_id: 'cust-001',
      property_id: 'prop-001',
      inquiry_type: '購入希望',
      status: 'open',
      inquired_at: '2024-01-01T00:00:00Z',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    },
    {
      inquiry_id: 'inq-002',
      client_id: 'client-001',
      customer_id: 'cust-002',
      property_id: 'prop-002',
      inquiry_type: '内覧希望',
      status: 'in_progress',
      inquired_at: '2024-01-02T00:00:00Z',
      created_at: '2024-01-02T00:00:00Z',
      updated_at: '2024-01-02T00:00:00Z'
    }
  ],
  reports: [
    {
      report_id: 'rep-001',
      client_id: 'client-001',
      property_id: 'prop-001',
      report_title: '月次レポート2024年1月',
      report_type: 'monthly',
      created_at: '2024-01-31T00:00:00Z',
      updated_at: '2024-01-31T00:00:00Z'
    },
    {
      report_id: 'rep-002',
      client_id: 'client-001',
      property_id: 'prop-001',
      report_title: '週次レポート2024年第1週',
      report_type: 'weekly',
      created_at: '2024-01-07T00:00:00Z',
      updated_at: '2024-01-07T00:00:00Z'
    }
  ]
};

// DynamoDB モック関数
export const mockDynamoDBDocumentClient = () => {
  const mockedSend = vi.fn().mockImplementation(async (command) => {
    if (command instanceof GetCommand) {
      const { Key, TableName } = command.input;
      // テーブル名からデータタイプを推定
      const dataType = TableName?.toLowerCase().replace('ippon-', '').replace('-local', '');
      const mockData = mockDynamoDBData[dataType as keyof typeof mockDynamoDBData];
      
      if (mockData) {
        const item = mockData.find((item: any) => {
          // キーに基づいてアイテムを検索
          return Object.entries(Key || {}).every(([key, value]) => item[key] === value);
        });
        return { Item: item };
      }
      return { Item: undefined };
    }
    
    if (command instanceof QueryCommand) {
      const { TableName, ExpressionAttributeValues } = command.input;
      const dataType = TableName?.toLowerCase().replace('ippon-', '').replace('-local', '');
      const mockData = mockDynamoDBData[dataType as keyof typeof mockDynamoDBData];
      
      if (mockData) {
        // クエリ条件に基づいてフィルタリング
        const items = mockData.filter((item: any) => {
          return Object.entries(ExpressionAttributeValues || {}).some(([key, value]) => {
            const attributeName = key.replace(':', '');
            return item[attributeName] === value || item.client_id === value;
          });
        });
        return { Items: items, Count: items.length };
      }
      return { Items: [], Count: 0 };
    }
    
    if (command instanceof PutCommand) {
      return { Attributes: command.input.Item };
    }
    
    if (command instanceof UpdateCommand) {
      return { Attributes: { ...command.input.Key, updated: true } };
    }
    
    if (command instanceof DeleteCommand) {
      return { Attributes: command.input.Key };
    }
    
    return {};
  });

  return {
    send: mockedSend
  };
};

// Cognito認証モック
export const mockCognitoAuth = () => {
  return vi.fn().mockImplementation((req, reply, done) => {
    req.userEmail = 'test@example.com';
    req.userGroup = 'admin';
    done();
  });
};

// JWTトークンモック
export const mockJwtToken = 'mock-jwt-token';
export const mockAuthHeaders = {
  authorization: `Bearer ${mockJwtToken}`
};

// ユーザーコンテキストモック
export const mockUserContext = {
  email: 'test@example.com',
  group: 'admin',
  sub: 'mock-user-sub',
  client_id: 'client-001'
}; 