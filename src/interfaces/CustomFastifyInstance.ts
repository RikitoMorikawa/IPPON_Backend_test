import { FastifyInstance } from 'fastify';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

export interface CustomFastifyInstance extends FastifyInstance {
  ddbDocClient: DynamoDBDocumentClient;
}
