import { DynamoDBRepository } from '@src/helpers/dynamodb/dynamoDBHelper';
import { FastifyInstance } from 'fastify';

export const registerComponents = (app: FastifyInstance) => {
  DynamoDBRepository.initialize();
};
