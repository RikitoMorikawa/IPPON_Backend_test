import dotenv from 'dotenv';
import AWS from 'aws-sdk';

dotenv.config();

const environment =
  (process.env.NODE_ENV as 'production' | 'development') || 'development';

type Environment = 'production' | 'development';

// Table: 個人顧客詳細 (Individual Customer Detail)
// Manages individual customers (物件購入見込み客)
const IndividualCustomerDetail: Record<Environment, string> = {
  production: 'prod-sales-brokerage-customer-individual-dynamodb',
  development: 'dev-sales-brokerage-customer-individual-dynamodb',
};

// Table: 問い合わせ情報 (Inquiry Info)
// Manages inquiries from customers
const Inquiry: Record<Environment, string> = {
  production: 'prod-sales-brokerage-inquiry-dynamodb',
  development: 'dev-sales-brokerage-inquiry-dynamodb',
};

// Table: 物件情報 (Property Info)
// Manages property info (土地, 新築, マンション)
const Property: Record<Environment, string> = {
  production: 'prod-sales-brokerage-property-dynamodb',
  development: 'dev-sales-brokerage-property-dynamodb',
};

// Table: 報告書情報 (Report Info)
// Manages reports sent to property owners
const AiReport: Record<Environment, string> = {
  production: 'prod-sales-brokerage-ai-report-dynamodb',
  development: 'dev-sales-brokerage-ai-report-dynamodb',
};

// Environment-specific frontend URLs
const frontendUrls: Record<Environment, string[]> = {
  development: [
    'http://localhost:5173',
  ],
  production: [
    'https://sales-brokerage.ippon-cloud.com',
    'https://ippon-cloud.com',
    'https://api.ippon-cloud.com',
  ],
};

// Environment-specific base URLs for password reset
const baseUrls: Record<Environment, string> = {
  development: 'http://localhost:3000',
  production: 'https://sales-brokerage.ippon-cloud.com',
};

AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

export default {
  environment,

  tableNames: {
    customers: IndividualCustomerDetail[environment],
    inquiry: Inquiry[environment],
    properties: Property[environment],
    report: AiReport[environment],
  },

  dynamoConfig: {
    region: process.env.AWS_REGION,
    endpoint: process.env.AWS_DYNAMO_ENDPOINT,
  },

  aws: {
    region: process.env.AWS_REGION,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    s3: {
      bucket: process.env.AWS_S3_BUCKET_NAME,
    },
  },

  frontend: {
    urls: frontendUrls[environment],
    baseUrl: baseUrls[environment],
  },

  email: {
    sourceEmail: process.env.AWS_SES_SOURCE_EMAIL || 'noreply@ippon-cloud.com',
  },

  server: {
    port: Number(process.env.PORT) || 3000,
    host: process.env.HOST || (environment === 'production' ? '0.0.0.0' : 'localhost'),
  },
};
