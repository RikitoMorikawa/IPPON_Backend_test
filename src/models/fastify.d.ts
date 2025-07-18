import { FastifyRequest } from 'fastify';

declare module 'fastify' {
  interface FastifyRequest {
    user?: any;
    ddbDocClient: DynamoDBDocumentClient;
  }
}
