import { FastifyReply } from 'fastify';
import { CustomFastifyInstance } from './CustomFastifyInstance';

export const checkDynamoDBClient = (app: CustomFastifyInstance, reply: FastifyReply): boolean => {
  if (!app.ddbDocClient) {
    reply.status(500).send({ error: 'DynamoDB Client is not initialized' });
    return false;
  }
  return true;
};

export const getDynamoDBClient = (app: CustomFastifyInstance) => {
  return app.ddbDocClient;
};
