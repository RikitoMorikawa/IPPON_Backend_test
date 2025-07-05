import AWS from 'aws-sdk';
import { ipponMemberClientId, ipponMemberClientSecret } from '../helpers/cognito/cognito';
import crypto from "crypto";
import config from '../config';
import dotenv from 'dotenv';
import { authLogger } from './logger';
dotenv.config();

const cognito = new AWS.CognitoIdentityServiceProvider({
  region: config.aws.region,
  accessKeyId: config.aws.accessKeyId,
  secretAccessKey: config.aws.secretAccessKey,
});

const ipponMemberUserpoolId = process.env.IPPON_CLIENT_EMPLOYEE_AWS_USER_POOL_ID;

export const computeSecretHash = (username: string, clientId: string, clientSecret: string): string => {
  const message = username + clientId;
  const hmac = crypto.createHmac("sha256", clientSecret);
  hmac.update(message);
  return Buffer.from(hmac.digest()).toString("base64");
}

export const signInCognito = async (email: string, password: string) => {
  authLogger.cognitoOperation('SIGN_IN', email, 'START');

  // Helper function to enable USER_PASSWORD_AUTH if not already enabled
  const ensureUserPasswordAuthEnabled = async () => {
    try {
      authLogger.info('Checking USER_PASSWORD_AUTH configuration', email);
      
      // First, check current app client settings
      const describeParams: AWS.CognitoIdentityServiceProvider.DescribeUserPoolClientRequest = {
        UserPoolId: ipponMemberUserpoolId as string,
        ClientId: ipponMemberClientId as string,
      };

      const clientDetails = await cognito.describeUserPoolClient(describeParams).promise();
      const currentAuthFlows = clientDetails.UserPoolClient?.ExplicitAuthFlows || [];

      // Check if USER_PASSWORD_AUTH is already enabled
      if (currentAuthFlows.includes('USER_PASSWORD_AUTH')) {
        authLogger.info('USER_PASSWORD_AUTH is already enabled', email);
        return true;
      }

      authLogger.warn('USER_PASSWORD_AUTH not enabled, enabling it now', email);

      // Add USER_PASSWORD_AUTH to existing auth flows
      const updatedAuthFlows = [
        'ALLOW_USER_AUTH',
        'ALLOW_USER_PASSWORD_AUTH',
        'ALLOW_USER_SRP_AUTH',
        'ALLOW_ADMIN_USER_PASSWORD_AUTH',
        'ALLOW_CUSTOM_AUTH',
        'ALLOW_REFRESH_TOKEN_AUTH'
      ];

      // Update the app client to enable USER_PASSWORD_AUTH
      const updateParams: AWS.CognitoIdentityServiceProvider.UpdateUserPoolClientRequest = {
        UserPoolId: ipponMemberUserpoolId as string,
        ClientId: ipponMemberClientId as string,
        ClientName: clientDetails.UserPoolClient?.ClientName,
        ExplicitAuthFlows: updatedAuthFlows,
        // Preserve other existing settings
        RefreshTokenValidity: clientDetails.UserPoolClient?.RefreshTokenValidity,
        AccessTokenValidity: clientDetails.UserPoolClient?.AccessTokenValidity,
        IdTokenValidity: clientDetails.UserPoolClient?.IdTokenValidity,
        TokenValidityUnits: clientDetails.UserPoolClient?.TokenValidityUnits,
        ReadAttributes: clientDetails.UserPoolClient?.ReadAttributes,
        WriteAttributes: clientDetails.UserPoolClient?.WriteAttributes,
        SupportedIdentityProviders: clientDetails.UserPoolClient?.SupportedIdentityProviders,
        CallbackURLs: clientDetails.UserPoolClient?.CallbackURLs,
        LogoutURLs: clientDetails.UserPoolClient?.LogoutURLs,
        AllowedOAuthFlows: clientDetails.UserPoolClient?.AllowedOAuthFlows,
        AllowedOAuthScopes: clientDetails.UserPoolClient?.AllowedOAuthScopes,
        AllowedOAuthFlowsUserPoolClient: clientDetails.UserPoolClient?.AllowedOAuthFlowsUserPoolClient,
        AnalyticsConfiguration: clientDetails.UserPoolClient?.AnalyticsConfiguration,
        PreventUserExistenceErrors: clientDetails.UserPoolClient?.PreventUserExistenceErrors,
        EnableTokenRevocation: clientDetails.UserPoolClient?.EnableTokenRevocation,
        EnablePropagateAdditionalUserContextData: clientDetails.UserPoolClient?.EnablePropagateAdditionalUserContextData,
      };

      await cognito.updateUserPoolClient(updateParams).promise();
      authLogger.info('USER_PASSWORD_AUTH has been enabled successfully', email);

      // Small delay to ensure the change is propagated
      await new Promise(resolve => setTimeout(resolve, 1000));

      return true;
    } catch (error: any) {
      authLogger.error('Error enabling USER_PASSWORD_AUTH', error, email);
      throw new Error(`Failed to enable USER_PASSWORD_AUTH: ${error.message}`);
    }
  };

  // Main sign-in logic
  const performSignIn = async () => {
    authLogger.info('Looking up user by email', email);
    
    const listUsersParams: AWS.CognitoIdentityServiceProvider.ListUsersRequest = {
      UserPoolId: ipponMemberUserpoolId as string,
      Filter: `email = "${email}"`,
    };

    const existingUsers = await cognito.listUsers(listUsersParams).promise();
    const username = existingUsers.Users?.[0]?.Username;
    
    if (!username) {
      authLogger.error('User not found in Cognito', null, email, { 
        usersFound: existingUsers.Users?.length || 0 
      });
      throw new Error('User not found');
    }

    authLogger.info('User found in Cognito, proceeding with authentication', email, { 
      username,
      userStatus: existingUsers.Users?.[0]?.UserStatus,
      enabled: existingUsers.Users?.[0]?.Enabled
    });

    const secretHash = computeSecretHash(username, ipponMemberClientId as string, ipponMemberClientSecret as string);

    const authParams: AWS.CognitoIdentityServiceProvider.InitiateAuthRequest = {
      AuthFlow: 'USER_PASSWORD_AUTH',
      ClientId: ipponMemberClientId as string,
      AuthParameters: {
        USERNAME: username,
        PASSWORD: password,
        SECRET_HASH: secretHash,
      },
    };

    authLogger.info('Initiating Cognito authentication', email, { 
      authFlow: 'USER_PASSWORD_AUTH',
      clientId: ipponMemberClientId
    });

    try {
      const result = await cognito.initiateAuth(authParams).promise();
      
      if (result.AuthenticationResult) {
        authLogger.cognitoOperation('SIGN_IN', email, 'SUCCESS', {
          accessTokenExists: !!result.AuthenticationResult.AccessToken,
          idTokenExists: !!result.AuthenticationResult.IdToken,
          refreshTokenExists: !!result.AuthenticationResult.RefreshToken,
          tokenType: result.AuthenticationResult.TokenType
        });
      }
      
      return result.AuthenticationResult || null;
    } catch (error: any) {
      // If the error is related to USER_PASSWORD_AUTH not being enabled, try to enable it
      if (error.code === 'InvalidParameterException' &&
        error.message?.includes('USER_PASSWORD_AUTH')) {

        authLogger.warn('USER_PASSWORD_AUTH permission error detected, attempting to enable', email, {
          errorCode: error.code,
          errorMessage: error.message
        });
        
        await ensureUserPasswordAuthEnabled();

        // Retry the authentication after enabling
        authLogger.info('Retrying authentication after enabling USER_PASSWORD_AUTH', email);
        const retryResult = await cognito.initiateAuth(authParams).promise();
        
        if (retryResult.AuthenticationResult) {
          authLogger.cognitoOperation('SIGN_IN', email, 'SUCCESS', {
            retryAttempt: true,
            accessTokenExists: !!retryResult.AuthenticationResult.AccessToken,
            idTokenExists: !!retryResult.AuthenticationResult.IdToken,
            refreshTokenExists: !!retryResult.AuthenticationResult.RefreshToken
          });
        }
        
        return retryResult.AuthenticationResult || null;
      }

      authLogger.error('Authentication failed', error, email, {
        errorCode: error.code,
        errorType: error.__type,
        requestId: error.requestId
      });
      
      throw error;
    }
  };

  try {
    // First, ensure USER_PASSWORD_AUTH is enabled
    await ensureUserPasswordAuthEnabled();

    // Then perform the sign-in
    return await performSignIn();
  } catch (error: any) {
    authLogger.cognitoOperation('SIGN_IN', email, 'ERROR', {
      errorCode: error.code,
      errorMessage: error.message,
      errorType: error.__type
    });
    
    throw new Error(`Failed to sign in with Cognito: ${error.message}`);
  }
};

// export const updateAccessTokenDuration = async () => {
//   try {
//     const params = {
//       UserPoolId: ipponMemberUserpoolId as string,
//       ClientId: ipponMemberClientId as string,
//       AccessTokenValidity: 86400,
//       RefreshTokenValidity: 30, 
//       TokenValidityUnits: {
//         AccessToken: 'seconds',
//         RefreshToken: 'days'
//       }
//     };

//     await cognito.updateUserPoolClient(params).promise();
//     console.log('Successfully updated access token duration to 24 hours');
//   } catch (error) {
//     console.error('Error updating access token duration:', error);
//     throw new Error('Failed to update access token duration');
//   }
// };