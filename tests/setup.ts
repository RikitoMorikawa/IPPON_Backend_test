import { beforeEach, vi } from 'vitest';
import { 
  MOCK_DATA, 
  MOCK_AUTH, 
  createMockDynamoDBClient, 
  createTestHelpers 
} from './mocks/mockHelpers';

// 🎭 テスト用モック作成
const testHelpers = createTestHelpers();
const mockServices = testHelpers.mockServices;

// 🎭 グローバルモック設定
vi.mock('@aws-sdk/lib-dynamodb', () => ({
  DynamoDBDocumentClient: {
    from: vi.fn().mockReturnValue(createMockDynamoDBClient())
  },
  GetCommand: vi.fn(),
  PutCommand: vi.fn(),
  QueryCommand: vi.fn(),
  DeleteCommand: vi.fn(),
  UpdateCommand: vi.fn()
}));

// 認証ミドルウェア
vi.mock('@src/middleware/middleware', () => ({
  cognitoAuthMiddleware: vi.fn().mockImplementation((req: any, reply: any, done: () => void) => {
    // 認証ヘッダーがない場合は401エラー
    if (!req.headers.authorization || req.headers.authorization === '') {
      return reply.status(401).send({
        success: false,
        status: 401,
        message: 'Unauthorized - No authorization header provided'
      });
    }
    
    // 正常な認証処理
    req.userEmail = MOCK_AUTH.userContext.email;
    req.userGroup = MOCK_AUTH.userContext.group;
    req.user = MOCK_AUTH.userContext;
    done();
  }),
  registerMiddlewares: vi.fn().mockResolvedValue(undefined)
}));

// ユーザーコンテキスト
vi.mock('@src/middleware/userContext', () => ({
  getClientId: mockServices.userContext.getClientId,
  getEmployeeId: mockServices.userContext.getEmployeeId
}));

// カスタマーサービス
vi.mock('@src/services/customerService', () => ({
  processCustomerFormData: vi.fn().mockImplementation(async (req, clientId) => {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    
    // バリデーション: 個人顧客のcustomer_nameが空の場合
    if (body.customer_type === 'individual' && 
        body.individual_customer_details && 
        (!body.individual_customer_details.customer_name || 
         body.individual_customer_details.customer_name.trim() === '')) {
      throw new Error('Customer name is required for individual customers');
    }
    
    // バリデーション: 法人顧客のcompany_nameが空の場合  
    if (body.customer_type === 'corporate' && 
        body.corporate_customer_details && 
        (!body.corporate_customer_details.company_name || 
         body.corporate_customer_details.company_name.trim() === '')) {
      throw new Error('Company name is required for corporate customers');
    }
    
    return {
      formData: {
        ...body,
        client_id: body.client_id || clientId,
        customer_created_at: body.customer_created_at || '2024-01-01T00:00:00.000Z'
      },
      idCardFrontUrls: [],
      idCardBackUrls: [],
      representativeIdCardFrontUrls: [],
      representativeIdCardBackUrls: [],
      managerIdCardFrontUrls: [],
      managerIdCardBackUrls: []
    };
  }),
  buildCustomerDetailFromFormData: vi.fn().mockReturnValue({
    id: 'new-customer-id',
    client_id: 'client-1',
    customer_type: 'individual',
    individual_customer_details: {
      customer_name: 'テスト顧客',
      email: 'test@example.com',
      phone: '090-1234-5678'
    }
  }),
  prepareCustomerDetailUpdates: vi.fn().mockReturnValue({
    updated_at: new Date().toISOString(),
    customer_type: 'individual'
  }),
  verifyDdbClient: vi.fn().mockReturnValue(true)
}));

// クライアントモデル
vi.mock('@src/repositroies/clientModel', () => ({
  getClientById: mockServices.clientModel.getClientById,
  getEmployeeById: mockServices.clientModel.getEmployeeById
}));

// 問い合わせモデル
vi.mock('@src/repositroies/inquiryModel', () => ({
  getAllInquiryHistory: mockServices.inquiryModel.getAllInquiryHistory,
  getAllInquires: vi.fn().mockResolvedValue({
    inquiries: [],
    total: 0
  }),
  searchInquiryHistoryDetails: mockServices.inquiryModel.searchInquiryHistoryDetails,
  createNewInquiry: mockServices.inquiryModel.createNewInquiry,
  saveInquiry: mockServices.inquiryModel.saveInquiry,
  updateInquiryHistory: mockServices.inquiryModel.updateInquiryHistory,
  showInquiryDetails: vi.fn().mockResolvedValue([])
}));

// 物件関連モデル
vi.mock('@src/repositroies/propertyModel', () => ({
  getAllProperties: mockServices.propertyModel.getAllProperties,
  getPropertyById: mockServices.propertyModel.getPropertyById
}));

// 顧客関連モデル
vi.mock('@src/repositroies/customerModel', () => ({
  getAllCustomerDetails: vi.fn().mockResolvedValue({
    customers: MOCK_DATA.customers,
    total: MOCK_DATA.customers.length
  }),
  fetchIndividualCustomerDetail: vi.fn().mockImplementation((ddbClient, customerId, clientId) => {
    if (customerId === 'non-existent-id') {
      return Promise.resolve(null);
    }
    return Promise.resolve(MOCK_DATA.customers[0]);
  }),
  fetchCorporateCustomerDetail: vi.fn().mockImplementation((ddbClient, customerId, clientId) => {
    if (customerId === 'non-existent-id') {
      return Promise.resolve(null);
    }
    return Promise.resolve(MOCK_DATA.customers[1]);
  }),
  saveCustomerDetail: vi.fn().mockResolvedValue({
    customer: MOCK_DATA.customers[0]
  }),
  updateCustomerDetail: vi.fn().mockResolvedValue({
    customer: MOCK_DATA.customers[0]
  }),
  deleteCustomerDetail: vi.fn().mockResolvedValue({
    success: true
  }),
  verifyCustomerDetailExists: vi.fn().mockImplementation((ddbClient, clientId, createdAt, customerId) => {
    if (customerId === 'non-existent-id') {
      return Promise.resolve(null);
    }
    return Promise.resolve(MOCK_DATA.customers[0]);
  }),
  deleteMultipleCustomerDetailsAndInquiries: vi.fn().mockImplementation(({ customerIds }) => {
    const existingIds = customerIds.filter((id: string) => id !== 'non-existent-id');
    const notFoundIds = customerIds.filter((id: string) => id === 'non-existent-id');
    
    if (notFoundIds.length === customerIds.length) {
      return Promise.resolve({
        customersDeleted: 0,
        inquiriesDeleted: 0,
        notFoundCustomerIds: notFoundIds,
        errors: []
      });
    }
    
    return Promise.resolve({
      customersDeleted: existingIds.length,
      inquiriesDeleted: existingIds.length,
      notFoundCustomerIds: notFoundIds,
      errors: []
    });
  }),
  executeCustomerDetailUpdate: vi.fn().mockResolvedValue({
    Attributes: MOCK_DATA.customers[0]
  }),
  incrementPropertyInquiryCount: mockServices.propertyModel.incrementPropertyInquiryCount
}));

// DynamoDB接続チェック
vi.mock('@src/interfaces/checkDynamoDBClient', () => ({
  checkDynamoDBClient: vi.fn().mockReturnValue(true),
  getDynamoDBClient: vi.fn().mockReturnValue(createMockDynamoDBClient())
}));

// バリデーション
vi.mock('@src/validations/inquiryValidation', () => ({
  inquirySchema: {
    validate: vi.fn().mockResolvedValue(true)
  },
  updateInquirySchema: {
    validate: vi.fn().mockResolvedValue(true)
  }
}));

// 問い合わせサービス
vi.mock('@src/services/inquiryService', () => ({
  splitPayload: vi.fn().mockReturnValue({
    customerUpdate: {
      customer_type: 'individual',
      individual_customer_details: {
        customer_name: '更新 太郎'
      }
    },
    inquiryUpdate: {}
  }),
  prepareInquiryUpdates: vi.fn().mockReturnValue({})
}));

// 🧹 テスト前の自動クリーンアップ
beforeEach(() => {
  testHelpers.resetAllMocks();
});

// 🚀 便利なエクスポート
export { MOCK_AUTH, MOCK_DATA } from './mocks/mockHelpers';
export const mockAuthHeaders = MOCK_AUTH.headers;
export const mockUserContext = MOCK_AUTH.userContext; 