import { vi } from 'vitest';

// DynamoDBモック
vi.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: vi.fn().mockImplementation(() => ({
    send: vi.fn().mockResolvedValue({})
  })),
  CreateTableCommand: vi.fn(),
  DescribeTableCommand: vi.fn(),
  ResourceNotFoundException: vi.fn()
}));

vi.mock('@aws-sdk/lib-dynamodb', () => ({
  DynamoDBDocumentClient: {
    from: vi.fn().mockImplementation(() => ({
      send: vi.fn().mockResolvedValue({})
    }))
  },
  GetCommand: vi.fn(),
  PutCommand: vi.fn(),
  QueryCommand: vi.fn(),
  DeleteCommand: vi.fn(),
  UpdateCommand: vi.fn(),
  ScanCommand: vi.fn(),
  BatchWriteCommand: vi.fn(),
  BatchGetCommand: vi.fn()
}));

// Cognitoモック
vi.mock('@aws-sdk/client-cognito-identity-provider', () => ({
  CognitoIdentityProviderClient: vi.fn().mockImplementation(() => ({
    send: vi.fn().mockResolvedValue({})
  })),
  InitiateAuthCommand: vi.fn(),
  ForgotPasswordCommand: vi.fn(),
  ConfirmForgotPasswordCommand: vi.fn(),
  GlobalSignOutCommand: vi.fn(),
  ChangePasswordCommand: vi.fn(),
  AdminGetUserCommand: vi.fn(),
  AdminCreateUserCommand: vi.fn(),
  AdminDeleteUserCommand: vi.fn(),
  AdminUpdateUserAttributesCommand: vi.fn()
}));

// S3モック
vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn().mockImplementation(() => ({
    send: vi.fn().mockResolvedValue({})
  })),
  PutObjectCommand: vi.fn(),
  GetObjectCommand: vi.fn(),
  DeleteObjectCommand: vi.fn(),
  ListObjectsV2Command: vi.fn()
}));

// SESモック
vi.mock('@aws-sdk/client-ses', () => ({
  SESClient: vi.fn().mockImplementation(() => ({
    send: vi.fn().mockResolvedValue({ MessageId: 'mock-message-id' })
  })),
  SendEmailCommand: vi.fn()
}));

// Middleware モック
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

// グローバルなテストユーティリティ
export const mockAuthHeaders = {
  authorization: 'Bearer mock-jwt-token'
};

export const mockUserContext = {
  email: 'test@example.com',
  group: 'admin',
  sub: 'mock-user-sub',
  client_id: 'client-001'
}; 