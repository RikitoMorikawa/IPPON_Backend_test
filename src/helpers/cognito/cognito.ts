import AWS from 'aws-sdk';
import dotenv from 'dotenv';
dotenv.config();

const {
  AWS_REGION,
  AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY,
  IPPON_CLIENT_EMPLOYEE_AWS_USER_POOL_ID,
  IPPON_CLIENT_EMPLOYEE_AWS_CLIENT_ID,
  IPPON_CLIENT_EMPLOYEE_AWS_CLIENT_SECRET
} = process.env;

if (!AWS_REGION || !AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY) {
  throw new Error('Missing required AWS Cognito environment variables.');
}

export const cognito = new AWS.CognitoIdentityServiceProvider({
  region: AWS_REGION,
  accessKeyId: AWS_ACCESS_KEY_ID,
  secretAccessKey: AWS_SECRET_ACCESS_KEY,
});

export const ipponMemberUserPoolId = IPPON_CLIENT_EMPLOYEE_AWS_USER_POOL_ID
export const ipponMemberClientId = IPPON_CLIENT_EMPLOYEE_AWS_CLIENT_ID
export const ipponMemberClientSecret = IPPON_CLIENT_EMPLOYEE_AWS_CLIENT_SECRET