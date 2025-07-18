import AWS from 'aws-sdk';
import { cognito, ipponMemberUserPoolId } from '@src/helpers/cognito/cognito';
import { PrismaClient } from '@prisma/client';
import { withoutDeleted } from '@src/utils/softDelete';
import { authLogger } from '@src/utils/logger';

const prisma = new PrismaClient();

export const checkEmailExists = async (email: string): Promise<boolean> => {
  authLogger.info('Checking email existence in both Cognito and PostgreSQL', email);

  try {
    // 1. PostgreSQLでの存在確認（必須）
    authLogger.info('Checking email in PostgreSQL master database', email);
    const postgresEmployee = await prisma.mstClientEmployees.findFirst({
      where: withoutDeleted({
        mail_address: email,
        is_active: true
      })
    });

    if (!postgresEmployee) {
      authLogger.warn('Email not found in PostgreSQL master database', email);
      return false;
    }

    // 2. Cognitoでの存在確認（必須）
    authLogger.info('Checking email in Cognito', email);
    const listUsersParams: AWS.CognitoIdentityServiceProvider.ListUsersRequest = {
      UserPoolId: ipponMemberUserPoolId as string,
      Filter: `email = "${email}"`,
    };

    const existingUsers = await cognito.listUsers(listUsersParams).promise();
    const cognitoExists = existingUsers.Users ? existingUsers.Users.length > 0 : false;

    if (!cognitoExists) {
      authLogger.warn('Email not found in Cognito', email);
      return false;
    }

    // 3. 両方に存在する場合のみtrue
    authLogger.info('Email verified in both PostgreSQL and Cognito', email, {
      postgresEmployeeId: postgresEmployee.id,
      postgresClientId: postgresEmployee.client_id,
      cognitoUserCount: existingUsers.Users?.length || 0
    });

    return true;
  } catch (error) {
    authLogger.error('Error checking email existence', error, email);
    return false;
  }
};
