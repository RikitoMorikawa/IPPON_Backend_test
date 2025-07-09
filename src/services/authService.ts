import { signInCognito } from '../utils/cognitoUtils';
import AWS from 'aws-sdk';
import * as crypto from 'crypto';
import { jwtDecode } from "jwt-decode";
import { CognitoIdentityServiceProvider } from 'aws-sdk';
import dotenv from 'dotenv';
import { ipponMemberClientId, ipponMemberClientSecret } from '../helpers/cognito/cognito';
import { computeSecretHash } from '../utils/cognitoUtils';
import { PrismaClient } from '@prisma/client';
import config from '../config';
import { authLogger } from '../utils/logger';
dotenv.config();


const cognito = new AWS.CognitoIdentityServiceProvider({
  region: config.aws.region
});

const prisma = new PrismaClient();



export const signInService = async (email: string, password: string) => {
  authLogger.info('Sign-in service started', email);

  try {
    const token: any = await signInCognito(email, password);

    if (!token) {
      authLogger.error('Cognito authentication returned null token', null, email);
      throw new Error('Authentication failed');
    }

    authLogger.info('Cognito authentication successful, decoding token', email);
    const decoded: any = await jwtDecode(token.IdToken);
    
    authLogger.info('JWT token decoded successfully', email, {
      sub: decoded.sub,
      hasClientId: !!decoded["custom:clientId"],
      hasGivenName: !!decoded["given_name"],
      hasFamilyName: !!decoded["last_name"],
      hasType: !!decoded["custom:type"],
      hasRole: !!decoded["custom:role"]
    });
    
    // PostgreSQLとCognitoの同期処理
    let clientId = decoded["custom:clientId"] || '';
    
    // custom:clientIdが空の場合、PostgreSQLから取得してCognitoに設定
    if (!clientId) {
      authLogger.warn('custom:clientId is empty, attempting to sync from PostgreSQL', email);
      
      try {
        // PostgreSQLでメールアドレスに対応するemployeeを検索
        authLogger.info('Searching for employee in PostgreSQL', email);
        
        const employee = await prisma.mstClientEmployees.findFirst({
          where: {
            mail_address: email,
            is_active: true
          },
          include: {
            client: true
          }
        });

        if (employee) {
          clientId = employee.client_id;
          
                     authLogger.info('Employee found in PostgreSQL, updating Cognito', email, {
             clientId: clientId,
             employeeId: employee.id,
             clientName: (employee.client as any)?.client_name
           });
          
          // Cognitoユーザーのcustom:clientId属性を更新
          const updateParams = {
            UserPoolId: process.env.IPPON_CLIENT_EMPLOYEE_AWS_USER_POOL_ID as string,
            Username: decoded.sub, // subを使用してユーザーを特定
            UserAttributes: [
              {
                Name: 'custom:clientId',
                Value: clientId
              }
            ]
          };

          await cognito.adminUpdateUserAttributes(updateParams).promise();
          authLogger.info('Cognito user attributes updated successfully', email, { clientId });
          
        } else {
          authLogger.error('No active client employee found for email', null, email);
          throw new Error(`No client employee found for email: ${email}`);
        }
        
      } catch (error) {
        authLogger.error('Error syncing PostgreSQL and Cognito', error, email);
        throw new Error(`Failed to sync user data: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } else {
      authLogger.info('custom:clientId found in token', email, { clientId });
    }

    const userData = {
      client_id: clientId,
      client_name: `${decoded["given_name"] || ''} ${decoded["last_name"] || ''}`.trim(),
      token,
      employee_id: decoded["sub"] || '',
      type: decoded["custom:type"] || '',
      role: decoded["custom:role"] || '',
    };

    authLogger.info('Sign-in service completed successfully', email, {
      clientId: userData.client_id,
      employeeId: userData.employee_id,
      type: userData.type,
      role: userData.role,
      hasAccessToken: !!token.AccessToken,
      hasIdToken: !!token.IdToken
    });

    return { data: userData };
  } catch (error) {
    authLogger.error('Sign-in service failed', error, email);
    throw error;
  }
};

export function calculateSecretHash(username: string) {
  const message = username + process.env.IPPON_CLIENT_EMPLOYEE_AWS_CLIENT_ID;
  const hmac = crypto.createHmac('SHA256', process.env.IPPON_CLIENT_EMPLOYEE_AWS_CLIENT_SECRET as string);
  return Buffer.from(hmac.update(message).digest()).toString('base64');
}


export const sendOtpService = async (email: string) => {
  authLogger.info('Send OTP service started', email);
  
  try {
    const params = {
      ClientId: process.env.IPPON_CLIENT_EMPLOYEE_AWS_CLIENT_ID as string,
      Username: email,
      SecretHash: calculateSecretHash(email)
    };

    authLogger.info('Initiating forgot password request to Cognito', email);
    await cognito.forgotPassword(params).promise();
    
    authLogger.info('OTP sent successfully', email);
  } catch (error) {
    authLogger.error('Send OTP failed', error, email);
    throw new Error("USER_RETRIEVE_FAILED");
  }
}

export const verifyOtpService = async (email: string, otp: string) => {
  authLogger.info('Verify OTP service started', email, { otpLength: otp.length });
  
  try {
    const tempPassword = `Temp${Math.random().toString(36).slice(2)}!1A`;

    const params = {
      ClientId: process.env.IPPON_CLIENT_EMPLOYEE_AWS_CLIENT_ID as string,
      Username: email,
      ConfirmationCode: otp,
      Password: tempPassword,
      SecretHash: calculateSecretHash(email)
    };

    authLogger.info('Verifying OTP with Cognito', email);
    await cognito.confirmForgotPassword(params).promise();
    
    authLogger.info('OTP verified successfully', email);
    return true;
  } catch (error) {
    authLogger.error('OTP verification failed', error, email, { otpLength: otp.length });
    return false;
  }
};

export const ResetPasswordService = async (email: string, verificationCode: string, newPassword: string) => {
  authLogger.info('Reset password service started', email, { 
    verificationCodeLength: verificationCode.length,
    newPasswordLength: newPassword.length 
  });
  
  try {
    const params = {
      ClientId: process.env.IPPON_CLIENT_EMPLOYEE_AWS_CLIENT_ID as string,
      Username: email,
      ConfirmationCode: verificationCode,
      Password: newPassword,
      SecretHash: calculateSecretHash(email)
    };

    const result = await cognito.confirmForgotPassword(params).promise();
    authLogger.info('Password reset completed successfully', email);
    return result;
  } catch (error) {
    authLogger.error('Password reset failed', error, email);
    throw error;
  }
}



export const generateRandomPassword = (length = 12) => {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const specialChars = '!@#$%^&*()_+{}[]';

  let password = '';
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += specialChars[Math.floor(Math.random() * specialChars.length)];

  const allChars = uppercase + lowercase + numbers + specialChars;

  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }

  return password.split('').sort(() => 0.5 - Math.random()).join('');
};

export const LogoutService = async (accessToken: string): Promise<boolean> => {
  authLogger.info('Logout service started');
  
  try {
    await cognito.globalSignOut({
      AccessToken: accessToken,
    }).promise();

    authLogger.info('Global sign out completed successfully');
    return true;
  } catch (error) {
    authLogger.error('Logout service failed', error);
    return false;
  }
};



export const changePasswordSeriveInCognito = async (
  email: string,
  oldPassword: string,
  newPassword: string
): Promise<boolean> => {
  authLogger.info('Change password service started', email, {
    oldPasswordLength: oldPassword.length,
    newPasswordLength: newPassword.length
  });
  
  const cognito = new CognitoIdentityServiceProvider();
  const secretHash = computeSecretHash(email, ipponMemberClientId as string, ipponMemberClientSecret as string);

  try {
    authLogger.info('Initiating authentication for password change', email);
    
    const authParams: CognitoIdentityServiceProvider.InitiateAuthRequest = {
      AuthFlow: 'USER_PASSWORD_AUTH',
      ClientId: ipponMemberClientId as string,
      AuthParameters: {
        USERNAME: email,
        PASSWORD: oldPassword,
        SECRET_HASH: secretHash,
      },
    };

    const authResult = await cognito.initiateAuth(authParams).promise();

    if (authResult.AuthenticationResult && authResult.AuthenticationResult.AccessToken) {
      authLogger.info('Authentication successful, proceeding with password change', email);
      
      const changePasswordParams: CognitoIdentityServiceProvider.ChangePasswordRequest = {
        PreviousPassword: oldPassword,
        ProposedPassword: newPassword,
        AccessToken: authResult.AuthenticationResult.AccessToken,
      };

      await cognito.changePassword(changePasswordParams).promise();
      authLogger.info('Password change completed successfully', email);
      return true;
    }
    else if (authResult.ChallengeName === 'NEW_PASSWORD_REQUIRED') {
      authLogger.info('NEW_PASSWORD_REQUIRED challenge detected, responding', email);
      
      const challengeResponse = await cognito.respondToAuthChallenge({
        ChallengeName: 'NEW_PASSWORD_REQUIRED',
        ClientId: ipponMemberClientId as string,
        ChallengeResponses: {
          USERNAME: email,
          NEW_PASSWORD: newPassword,
          SECRET_HASH: secretHash,
        },
        Session: authResult.Session as string
      }).promise();

      const success = !!challengeResponse.AuthenticationResult;
      authLogger.info('NEW_PASSWORD_REQUIRED challenge completed', email, { success });
      return success;
    }

    authLogger.error('Failed to authenticate user - no valid result', null, email, {
      hasAuthResult: !!authResult.AuthenticationResult,
      challengeName: authResult.ChallengeName
    });
    throw new Error('Failed to authenticate user');
  } catch (error) {
    authLogger.error('Error changing password', error, email);
    throw new Error(error instanceof Error ? error.message : 'Failed to change password');
  }
};



export const changeUserPasswordSeriveInCognito = async (
  email: string,
  oldPassword: string,
  newPassword: string
): Promise<boolean> => {
  authLogger.info('Change user password service started', email, {
    oldPasswordLength: oldPassword.length,
    newPasswordLength: newPassword.length
  });
  
  const cognito = new CognitoIdentityServiceProvider();
  const secretHash = computeSecretHash(email, ipponMemberClientId as string, ipponMemberClientSecret as string);

  try {
    authLogger.info('Initiating authentication for user password change', email);
    
    const authParams: CognitoIdentityServiceProvider.InitiateAuthRequest = {
      AuthFlow: 'USER_PASSWORD_AUTH',
      ClientId: ipponMemberClientId as string,
      AuthParameters: {
        USERNAME: email,
        PASSWORD: oldPassword,
        SECRET_HASH: secretHash,
      },
    };

    const authResult = await cognito.initiateAuth(authParams).promise();

    if (authResult.AuthenticationResult && authResult.AuthenticationResult.AccessToken) {
      authLogger.info('Authentication successful, proceeding with user password change', email);
      
      const changePasswordParams: CognitoIdentityServiceProvider.ChangePasswordRequest = {
        PreviousPassword: oldPassword,
        ProposedPassword: newPassword,
        AccessToken: authResult.AuthenticationResult.AccessToken,
      };

      await cognito.changePassword(changePasswordParams).promise();
      authLogger.info('User password change completed successfully', email);
      return true;
    }
    else if (authResult.ChallengeName === 'NEW_PASSWORD_REQUIRED') {
      authLogger.info('NEW_PASSWORD_REQUIRED challenge detected for user password change', email);
      
      const challengeResponse = await cognito.respondToAuthChallenge({
        ChallengeName: 'NEW_PASSWORD_REQUIRED',
        ClientId: ipponMemberClientId as string,
        ChallengeResponses: {
          USERNAME: email,
          NEW_PASSWORD: newPassword,
          SECRET_HASH: secretHash,
        },
        Session: authResult.Session as string
      }).promise();

      const success = !!challengeResponse.AuthenticationResult;
      authLogger.info('NEW_PASSWORD_REQUIRED challenge completed for user', email, { success });
      return success;
    }

    authLogger.error('Failed to authenticate user for password change - no valid result', null, email, {
      hasAuthResult: !!authResult.AuthenticationResult,
      challengeName: authResult.ChallengeName
    });
    throw new Error('Failed to authenticate user');
  } catch (error) {
    authLogger.error('Error changing user password', error, email);
    throw new Error(error instanceof Error ? error.message : 'Failed to change password');
  }
};