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
  UpdateCommand: vi.fn()
}));

// Cognitoモック
vi.mock('@aws-sdk/client-cognito-identity-provider', () => ({
  CognitoIdentityProviderClient: vi.fn().mockImplementation(() => ({
    send: vi.fn().mockImplementation(async (command) => {
      const commandName = command.constructor.name;
      
      if (commandName === 'InitiateAuthCommand') {
        if (command.input.AuthParameters?.USERNAME === 'test@example.com' &&
            command.input.AuthParameters?.PASSWORD === 'Test1234!') {
          return {
            AuthenticationResult: {
              AccessToken: 'mock-access-token',
              IdToken: 'mock-id-token',
              RefreshToken: 'mock-refresh-token'
            }
          };
        }
        throw new Error('Invalid credentials');
      }
      
      if (commandName === 'ForgotPasswordCommand') {
        if (command.input.Username === 'nonexistent@example.com') {
          throw new Error('User not found');
        }
        return { CodeDeliveryDetails: { DeliveryMedium: 'EMAIL' } };
      }
      
      if (commandName === 'ConfirmForgotPasswordCommand') {
        if (command.input.ConfirmationCode !== '123456') {
          throw new Error('Invalid code');
        }
        return {};
      }
      
      if (commandName === 'GlobalSignOutCommand') {
        return {};
      }
      
      if (commandName === 'ChangePasswordCommand') {
        return {};
      }
      
      if (commandName === 'AdminGetUserCommand') {
        if (command.input.Username === 'nonexistent@example.com') {
          throw new Error('User not found');
        }
        return {
          UserAttributes: [
            { Name: 'email', Value: 'test@example.com' }
          ]
        };
      }
      
      return {};
    })
  })),
  InitiateAuthCommand: vi.fn(),
  ForgotPasswordCommand: vi.fn(),
  ConfirmForgotPasswordCommand: vi.fn(),
  GlobalSignOutCommand: vi.fn(),
  ChangePasswordCommand: vi.fn(),
  AdminGetUserCommand: vi.fn()
}));

// テストシナリオ
/*
  1. 成功ケース
    1.1 正常なログイン
    1.2 OTP送信
    1.3 OTP検証
    1.4 パスワードリセット
    1.5 メール存在確認
    1.6 パスワード変更
    1.7 ログアウト

  2. エラーケース
    2.1 無効な認証情報でのログイン
    2.2 存在しないメールでのOTP送信
    2.3 無効なOTPでの検証
    2.4 不正なトークンでのログアウト
*/

describe('Auth API Integration Tests', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    // CognitoのモックをカスタマイズしてAuth用の応答を設定
    const { CognitoIdentityProviderClient } = await import('@aws-sdk/client-cognito-identity-provider');
    const mockSend = vi.fn().mockImplementation(async (command) => {
      const commandName = command.constructor.name;
      
      if (commandName === 'InitiateAuthCommand') {
        if (command.input.AuthParameters?.USERNAME === 'test@example.com' &&
            command.input.AuthParameters?.PASSWORD === 'Test1234!') {
          return {
            AuthenticationResult: {
              AccessToken: 'mock-access-token',
              IdToken: 'mock-id-token',
              RefreshToken: 'mock-refresh-token'
            }
          };
        }
        throw new Error('Invalid credentials');
      }
      
      if (commandName === 'ForgotPasswordCommand') {
        if (command.input.Username === 'nonexistent@example.com') {
          throw new Error('User not found');
        }
        return { CodeDeliveryDetails: { DeliveryMedium: 'EMAIL' } };
      }
      
      if (commandName === 'ConfirmForgotPasswordCommand') {
        if (command.input.ConfirmationCode !== '123456') {
          throw new Error('Invalid code');
        }
        return {};
      }
      
      if (commandName === 'GlobalSignOutCommand') {
        return {};
      }
      
      if (commandName === 'ChangePasswordCommand') {
        return {};
      }
      
      if (commandName === 'AdminGetUserCommand') {
        if (command.input.Username === 'nonexistent@example.com') {
          throw new Error('User not found');
        }
        return {
          UserAttributes: [
            { Name: 'email', Value: 'test@example.com' }
          ]
        };
      }
      
      return {};
    });
    
    // モックインスタンスにsendメソッドを設定
    (CognitoIdentityProviderClient as any).mockImplementation(() => ({
      send: mockSend
    }));

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
    it('1.1 正常なログイン', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/signin',
        payload: {
          email: 'test@example.com',
          password: 'Test1234!'
        }
      });

      expect(response.statusCode).toBe(200);
      const payload = JSON.parse(response.body);
      expect(payload.status).toBe(200);
      expect(payload.message).toBeDefined();
      expect(payload.data).toBeDefined();
      expect(payload.data.access_token).toBe('mock-access-token');
      expect(payload.data.id_token).toBe('mock-id-token');
      expect(payload.data.refresh_token).toBe('mock-refresh-token');
    });

    it('1.2 OTP送信', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/otp',
        payload: {
          email: 'test@example.com'
        }
      });

      expect(response.statusCode).toBe(200);
      const payload = JSON.parse(response.body);
      expect(payload.status).toBe(200);
      expect(payload.message).toContain('OTP sent successfully');
    });

    it('1.3 OTP検証', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/verify-otp',
        payload: {
          email: 'test@example.com',
          otp: '123456'
        }
      });

      expect(response.statusCode).toBe(200);
      const payload = JSON.parse(response.body);
      expect(payload.status).toBe(200);
      expect(payload.message).toContain('OTP verified successfully');
    });

    it('1.4 パスワードリセット', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/reset-password',
        payload: {
          email: 'test@example.com',
          code: '123456',
          password: 'NewPassword123!'
        }
      });

      expect(response.statusCode).toBe(200);
      const payload = JSON.parse(response.body);
      expect(payload.status).toBe(200);
      expect(payload.message).toContain('Password reset successfully');
    });

    it('1.5 メール存在確認', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/check-email',
        payload: {
          email: 'test@example.com'
        }
      });

      expect(response.statusCode).toBe(200);
      const payload = JSON.parse(response.body);
      expect(payload.status).toBe(200);
      expect(payload.message).toContain('Email exists');
    });

    it('1.6 パスワード変更（認証が必要）', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/change-password',
        headers: mockAuthHeaders,
        payload: {
          oldPassword: 'Test1234!',
          newPassword: 'NewTest1234!'
        }
      });

      expect(response.statusCode).toBe(200);
      const payload = JSON.parse(response.body);
      expect(payload.status).toBe(200);
      expect(payload.message).toContain('Password changed successfully');
    });

    it('1.7 ログアウト（認証が必要）', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/logout',
        headers: mockAuthHeaders
      });

      expect(response.statusCode).toBe(200);
      const payload = JSON.parse(response.body);
      expect(payload.status).toBe(200);
      expect(payload.message).toContain('Logout successful');
    });
  });

  describe('エラーシナリオ', () => {
    it('2.1 無効な認証情報でのログイン', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/signin',
        payload: {
          email: 'test@example.com',
          password: 'WrongPassword'
        }
      });

      expect(response.statusCode).toBe(400);
      const payload = JSON.parse(response.body);
      expect(payload.status).toBe(400);
      expect(payload.message).toContain('Invalid credentials');
    });

    it('2.2 存在しないメールでのOTP送信', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/otp',
        payload: {
          email: 'nonexistent@example.com'
        }
      });

      expect(response.statusCode).toBe(404);
      const payload = JSON.parse(response.body);
      expect(payload.status).toBe(404);
      expect(payload.message).toContain('User not found');
    });

    it('2.3 無効なOTPでの検証', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/verify-otp',
        payload: {
          email: 'test@example.com',
          otp: '999999'
        }
      });

      expect(response.statusCode).toBe(400);
      const payload = JSON.parse(response.body);
      expect(payload.status).toBe(400);
      expect(payload.message).toContain('Invalid OTP');
    });

    it('2.4 不正なトークンでのログアウト', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/logout',
        headers: {
          authorization: 'Bearer invalid-token'
        }
      });

      expect(response.statusCode).toBe(401);
      const payload = JSON.parse(response.body);
      expect(payload.status).toBe(401);
      expect(payload.message).toContain('Unauthorized');
    });
  });
}); 