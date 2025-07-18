import dotenv from 'dotenv';
import AWS from 'aws-sdk';

dotenv.config();

const environment =
  (process.env.NODE_ENV as 'production' | 'development') || 'development';

type Environment = 'production' | 'development';

// Table: 顧客詳細 (Customer Detail)
// Manages customers (物件購入見込み客)
const CustomerDetail: Record<Environment, string> = {
  production: 'prod-sales-brokerage-customer-detail-dynamodb',
  development: 'dev-sales-brokerage-customer-detail-dynamodb',
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

// Table: バッチレポート設定 (Batch Report Settings)
// Manages batch report generation settings
const BatchReportSettings: Record<Environment, string> = {
  production: 'prod-sales-brokerage-batch-report-settings-dynamodb',
  development: 'dev-sales-brokerage-batch-report-settings-dynamodb',
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
    customers: CustomerDetail[environment],
    inquiry: Inquiry[environment],
    properties: Property[environment],
    report: AiReport[environment],
    batchReportSettings: BatchReportSettings[environment],
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
      // Base bucket name from environment (e.g., "sales-brokerage")
      baseBucket: process.env.AWS_S3_BUCKET_NAME,
      // Always use prod bucket prefix (dev buckets don't exist yet)
      bucketPrefix: 'prod-',
      // Bucket suffix mapping for different purposes - always use prod buckets
      buckets: {
        property: 'prod-sales-brokerage-s3-bucket-property',
        client: 'prod-sales-brokerage-s3-bucket-client',
        company: 'prod-sales-brokerage-s3-bucket-company',
        document: 'prod-sales-brokerage-s3-bucket-document',
        contractor: 'prod-sales-brokerage-s3-bucket-contractor',
        delete: 'prod-sales-brokerage-s3-bucket-delete',
      },
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
