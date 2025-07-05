import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.{test,spec}.ts'],
    coverage: {
      reporter: ['text', 'json', 'html'],
    },
    setupFiles: ['./tests/setup.ts'],
    env: {
      NODE_ENV: 'development',
      AWS_REGION: 'ap-northeast-1',
      AWS_ACCESS_KEY_ID: 'test-access-key',
      AWS_SECRET_ACCESS_KEY: 'test-secret-key',
      AWS_DYNAMO_ENDPOINT: 'http://localhost:8080',
      AWS_S3_BUCKET_NAME: 'test-bucket',
      AWS_SES_SOURCE_EMAIL: 'test@example.com',
      PORT: '3000',
      HOST: 'localhost',
      LOG_LEVEL: 'error'
    }
  },
  resolve: {
    alias: {
      '@src': '/src',
      '@tests': '/tests'
    }
  }
});