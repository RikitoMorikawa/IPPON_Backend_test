import { vi } from 'vitest';
import { DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand, DeleteCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

// 🎯 実際のシードデータに基づいた包括的なモックデータセット
export const MOCK_DATA = {
  // クライアント（PostgreSQL側のデータ）
  clients: [
    {
      id: 'client-001',
      client_id: 'client-001',
      name: 'テストクライアント1',
      company_name: '株式会社テスト不動産ライフ',
      email: 'client1@test.com',
      phone: '03-1234-5678',
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-01T00:00:00.000Z'
    },
    {
      id: 'client-002',
      client_id: 'client-002',
      name: 'テストクライアント2',
      company_name: '株式会社大阪不動産',
      email: 'client2@test.com',
      phone: '06-1234-5678',
      created_at: '2024-01-02T00:00:00.000Z',
      updated_at: '2024-01-02T00:00:00.000Z'
    }
  ],

  // 従業員（PostgreSQL側のデータ）
  employees: [
    {
      id: 'emp-001',
      employee_id: 'emp-001',
      client_id: 'client-001',
      first_name: '太郎',
      last_name: '田中',
      mail_address: 'tanaka@test.com',
      department: '営業部',
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-01T00:00:00.000Z'
    },
    {
      id: 'emp-002',
      employee_id: 'emp-002',
      client_id: 'client-001',
      first_name: '花子',
      last_name: '山田',
      mail_address: 'yamada@test.com',
      department: '管理部',
      created_at: '2024-01-02T00:00:00.000Z',
      updated_at: '2024-01-02T00:00:00.000Z'
    }
  ],

  // 顧客詳細（DynamoDB CustomerDetail）
  customers: [
    {
      id: 'cust-001',
      client_id: 'client-001',
      employee_id: 'emp-001',
      customer_type: 'individual_customer',
      property_ids: ['prop-001'],
      individual_customer_details: {
        first_name: '太郎',
        last_name: '田中',
        birthday: '1985-05-15',
        mail_address: 'customer1@example.com',
        postcode: '1000001',
        prefecture: '東京都',
        city: '千代田区',
        street_address: '千代田1-2-3',
        building: 'チヨダマンション',
        id_card_front_path: 'https://s3.amazonaws.com/individual_customer_register_files/client-001/front_sample.jpg',
        id_card_back_path: 'https://s3.amazonaws.com/individual_customer_register_files/client-001/back_sample.jpg'
      },
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-01T00:00:00.000Z'
    },
    {
      id: 'cust-002',
      client_id: 'client-001',
      employee_id: 'emp-001',
      customer_type: 'corporate_customer',
      property_ids: ['prop-002'],
      corporate_customer_details: {
        corporate_name: '株式会社東京商事',
        corporate_name_kana: 'カブシキガイシャトウキョウショウジ',
        head_office_postcode: '1000001',
        head_office_prefecture: '東京都',
        head_office_city: '千代田区',
        head_office_street_address: '千代田2-3-4',
        head_office_building: '東京ビル',
        head_office_phone_number: '03-1234-5678',
        business_type: '商業',
        state_of_listing: '非上場',
        capital_fund: '1000万円',
        annual_turnover: '5000万円',
        primary_bank: 'みずほ銀行',
        employees_count: '50名',
        establishment_date: '2010-04-01',
        representative_last_name: '鈴木',
        representative_first_name: '一郎',
        representative_last_name_kana: 'スズキ',
        representative_first_name_kana: 'イチロウ',
        representative_mobile_number: '090-1111-2222',
        representative_postcode: '1000002',
        representative_prefecture: '東京都',
        representative_city: '港区',
        representative_street_address: '六本木1-2-3',
        representative_building: '六本木ハイツ'
      },
      created_at: '2024-01-02T00:00:00.000Z',
      updated_at: '2024-01-02T00:00:00.000Z'
    }
  ],

  // 物件（DynamoDB Property）
  properties: [
    {
      id: 'prop-001',
      client_id: 'client-001',
      employee_id: 'emp-001',
      name: '東京都千代田区の高級マンション',
      type: 'マンション',
      price: 85000000,
      postcode: '1000001',
      prefecture: '東京都',
      city: '千代田区',
      street_address: '千代田2-3-4',
      building_name: 'グランドマンション千代田',
      floor_area: 85.5,
      rooms: '3LDK',
      construction_year: 2024,
      parking: true,
      inquiry_count: 5,
      sales_start_date: '2024-01-01',
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-01T00:00:00.000Z'
    },
    {
      id: 'prop-002',
      client_id: 'client-001',
      employee_id: 'emp-001',
      name: '東京都港区のタワーマンション',
      type: 'マンション',
      price: 120000000,
      postcode: '1060032',
      prefecture: '東京都',
      city: '港区',
      street_address: '六本木3-4-5',
      building_name: 'プレミアムタワー六本木',
      floor_area: 102.8,
      rooms: '4LDK',
      construction_year: 2025,
      parking: true,
      inquiry_count: 3,
      sales_start_date: '2024-01-15',
      created_at: '2024-01-15T00:00:00.000Z',
      updated_at: '2024-01-15T00:00:00.000Z'
    }
  ],

  // 問い合わせ（DynamoDB Inquiry）
  inquiries: [
    {
      id: 'inq-001',
      client_id: 'client-001',
      customer_id: 'cust-001',
      property_id: 'prop-001',
      employee_id: 'emp-001',
      inquired_at: '2024-01-15T10:00:00.000Z',
      title: 'テスト問い合わせ1',
      category: 'inquiry',
      type: 'viewing',
      method: 'SUUMO',
      summary: 'SUUMOの物件に関するSUUMOでの問い合わせです。見学希望のお問い合わせです。',
      created_at: '2024-01-15T10:00:00.000Z',
      updated_at: '2024-01-15T10:00:00.000Z'
    },
    {
      id: 'inq-002',
      client_id: 'client-001',
      customer_id: 'cust-002',
      property_id: 'prop-002',
      employee_id: 'emp-002',
      inquired_at: '2024-01-16T14:00:00.000Z',
      title: '内覧希望',
      category: 'inquiry',
      type: 'information',
      method: '電話',
      summary: '電話での物件に関する電話での問い合わせです。詳細情報についてのお問い合わせです。',
      created_at: '2024-01-16T14:00:00.000Z',
      updated_at: '2024-01-16T14:00:00.000Z'
    }
  ],

  // レポート（DynamoDB AiReport）
  reports: [
    {
      id: 'rep-001',
      client_id: 'client-001',
      property_id: 'prop-001',
      report_start_date: '2024-01-01',
      report_end_date: '2024-01-31',
      title: 'テストクライアント1月次活動報告書',
      is_draft: false,
      current_status: '販売中',
      summary: 'テストクライアント1の物件活動報告書です。順調に問い合わせが入っており、見学希望者も複数名います。',
      is_suumo_published: true,
      views_count: 75,
      inquiries_count: 5,
      business_meeting_count: 2,
      viewing_count: 3,
      customer_interactions: [
        {
          customer_id: 'cust-001',
          customer_name: '田中太郎',
          date: '2024-01-15',
          title: 'テスト問い合わせ1',
          category: '内見',
          content: 'SUUMOの物件に関するSUUMOでの問い合わせです。見学希望のお問い合わせです。'
        }
      ],
      price: '85000000',
      sales_start_date: '2024-01-01',
      created_at: '2024-01-31T00:00:00.000Z',
      updated_at: '2024-01-31T00:00:00.000Z'
    }
  ]
};

// 📝 テーブル名からデータタイプを推定
const getDataTypeFromTableName = (tableName?: string): keyof typeof MOCK_DATA => {
  if (!tableName) return 'clients';
  
  const name = tableName.toLowerCase();
  if (name.includes('customer')) return 'customers';
  if (name.includes('inquiry')) return 'inquiries';
  if (name.includes('property')) return 'properties';
  if (name.includes('report')) return 'reports';
  if (name.includes('employee')) return 'employees';
  return 'clients';
};

// 🤖 スマートなDynamoDBモック関数
export const createMockDynamoDBClient = () => {
  const mockedSend = vi.fn().mockImplementation(async (command) => {
    console.log('🔍 DynamoDB Mock Command:', command.constructor.name, command.input);

    // GET操作
    if (command instanceof GetCommand) {
      const { Key, TableName } = command.input;
      const dataType = getDataTypeFromTableName(TableName);
      const mockData = MOCK_DATA[dataType];
      
      if (mockData) {
        const item = mockData.find((item: any) => {
          return Object.entries(Key || {}).every(([key, value]) => item[key] === value);
        });
        console.log('📦 Mock GET Result:', item ? 'Found' : 'Not Found');
        return { Item: item };
      }
      return { Item: undefined };
    }

    // QUERY操作
    if (command instanceof QueryCommand) {
      const { TableName, ExpressionAttributeValues, FilterExpression } = command.input;
      const dataType = getDataTypeFromTableName(TableName);
      const mockData = MOCK_DATA[dataType];
      
      if (mockData) {
        let items = mockData.filter((item: any) => {
          // client_idでフィルタ
          if (ExpressionAttributeValues?.[':client_id']) {
            return item.client_id === ExpressionAttributeValues[':client_id'];
          }
          // その他のフィルタ条件
          return true;
        });

        // フィルタ式の簡単な処理（titleなど）
        if (FilterExpression && ExpressionAttributeValues?.[':title']) {
          const titleFilter = ExpressionAttributeValues[':title'];
          if (titleFilter === '新規問い合わせ') {
            items = []; // 新規問い合わせは空配列を返す
          } else {
            items = items.filter((item: any) => 
              item.title && item.title.includes(titleFilter)
            );
          }
        }

        console.log('📦 Mock QUERY Result:', items.length, 'items');
        return { 
          Items: items, 
          Count: items.length,
          ScannedCount: items.length
        };
      }
      return { Items: [], Count: 0, ScannedCount: 0 };
    }

    // PUT操作
    if (command instanceof PutCommand) {
      console.log('📦 Mock PUT Result: Success');
      return { Attributes: command.input.Item };
    }

    // UPDATE操作
    if (command instanceof UpdateCommand) {
      const { Key } = command.input;
      console.log('📦 Mock UPDATE Result: Success');
      return { 
        Attributes: { 
          ...Key, 
          updated_at: new Date().toISOString(),
          updated: true 
        } 
      };
    }

    // DELETE操作
    if (command instanceof DeleteCommand) {
      console.log('📦 Mock DELETE Result: Success');
      return { Attributes: command.input.Key };
    }

    return {};
  });

  return { send: mockedSend };
};

// 🎭 モック関数の作成
export const createMockServices = () => {
  return {
    // ユーザーコンテキスト
    userContext: {
      getClientId: vi.fn(() => 'client-001'),
      getEmployeeId: vi.fn(() => 'emp-001'),
    },

    // カスタマーサービス
    customerService: {
      processCustomerFormData: vi.fn().mockResolvedValue({
        formData: {
          customer_id: 'cust-001',
          property_id: 'prop-001',
          employee_id: 'emp-001',
          type: 'viewing',
          method: 'SUUMO',
          summary: 'テスト問い合わせです',
          category: 'inquiry',
          title: 'テスト問い合わせタイトル',
          inquired_at: '2024-01-15T10:00:00.000Z'
        }
      })
    },

    // クライアントモデル
    clientModel: {
      getClientById: vi.fn((id: string) => 
        MOCK_DATA.clients.find(c => c.id === id || c.client_id === id)
      ),
      getEmployeeById: vi.fn((id: string) => 
        MOCK_DATA.employees.find(e => e.id === id || e.employee_id === id)
      )
    },

    // 問い合わせモデル
    inquiryModel: {
      getAllInquiryHistory: vi.fn().mockResolvedValue({
        inquires: MOCK_DATA.inquiries,
        total: MOCK_DATA.inquiries.length
      }),
      searchInquiryHistoryDetails: vi.fn().mockResolvedValue({
        inquiries: MOCK_DATA.inquiries.filter(inq => inq.title.includes('テスト')),
        total: 1
      }),
      createNewInquiry: vi.fn((data: any) => ({ ...data, id: 'new-inq-001' })),
      saveInquiry: vi.fn().mockResolvedValue({}),
      updateInquiryHistory: vi.fn().mockResolvedValue({
        ...MOCK_DATA.inquiries[0],
        title: '更新されたタイトル'
      })
    },

    // 物件モデル
    propertyModel: {
      getAllProperties: vi.fn().mockResolvedValue({
        properties: MOCK_DATA.properties,
        total: MOCK_DATA.properties.length
      }),
      getPropertyById: vi.fn().mockResolvedValue({
        Items: [MOCK_DATA.properties[0]]
      }),
      incrementPropertyInquiryCount: vi.fn().mockResolvedValue({})
    }
  };
};

// 🔑 認証関連のモック
export const MOCK_AUTH = {
  headers: {
    authorization: 'Bearer mock-jwt-token',
    'content-type': 'application/json'
  },
  
  userContext: {
    email: 'test@example.com',
    group: 'admin',
    sub: 'mock-user-sub',
    client_id: 'client-001'
  },

  createCognitoMiddleware: () => vi.fn().mockImplementation((req: any, reply: any, done: () => void) => {
    req.userEmail = MOCK_AUTH.userContext.email;
    req.userGroup = MOCK_AUTH.userContext.group;
    req.user = MOCK_AUTH.userContext;
    done();
  })
};

// 🚀 簡単に使えるエクスポート
export const mockDynamoDBDocumentClient = createMockDynamoDBClient;
export const mockAuthHeaders = MOCK_AUTH.headers;
export const mockUserContext = MOCK_AUTH.userContext;
export const mockDynamoDBData = MOCK_DATA; // 後方互換性のため

// 🎪 便利なテストヘルパー
export const createTestHelpers = () => {
  const mockServices = createMockServices();
  
  return {
    mockServices,
    
    resetAllMocks: () => {
      Object.values(mockServices).forEach((service: any) => {
        Object.values(service).forEach((fn: any) => {
          if (vi.isMockFunction(fn)) {
            fn.mockClear();
          }
        });
      });
    },

    setMockReturnValue: (servicePath: string, methodName: string, returnValue: any) => {
      const service = (mockServices as any)[servicePath];
      if (service && service[methodName] && vi.isMockFunction(service[methodName])) {
        service[methodName].mockResolvedValue(returnValue);
      }
    },

    // テストデータファクトリー
    createTestInquiry: (overrides: Partial<any> = {}) => ({
      ...MOCK_DATA.inquiries[0],
      ...overrides,
      id: `test-${Date.now()}`
    }),

    createTestCustomer: (overrides: Partial<any> = {}) => ({
      ...MOCK_DATA.customers[0],
      ...overrides,
      id: `test-${Date.now()}`
    }),

    createTestProperty: (overrides: Partial<any> = {}) => ({
      ...MOCK_DATA.properties[0],
      ...overrides,
      id: `test-${Date.now()}`
    })
  };
};

// 📦 全モック設定関数（テストファイルで使用）
export const setupMocks = () => {
  const helpers = createTestHelpers();
  
  // DynamoDBクライアントのモック
  const mockDynamoClient = createMockDynamoDBClient();
  
  // アプリインスタンスのモック
  const mockApp = {
    ddbDocClient: mockDynamoClient,
    checkDynamoDBClient: () => true,
    getDynamoDBClient: () => mockDynamoClient
  };
  
  return {
    ...helpers,
    mockApp,
    mockDynamoClient
  };
}; 