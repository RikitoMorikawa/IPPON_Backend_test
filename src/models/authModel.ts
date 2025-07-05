import AWS from 'aws-sdk';
import { cognito, ipponMemberUserPoolId } from '@src/helpers/cognito/cognito';

export const checkEmailExists = async (email: string): Promise<boolean> => {
  try {
    const listUsersParams: AWS.CognitoIdentityServiceProvider.ListUsersRequest = {
      UserPoolId: ipponMemberUserPoolId as string,
      Filter: `email = "${email}"`,
    };

    const existingUsers = await cognito.listUsers(listUsersParams).promise();
    return existingUsers.Users ? existingUsers.Users.length > 0 : false;
  } catch (error) {
    return false;
  }
};
