import { PrismaClient } from '@prisma/client';
import { DynamoDBDocumentClient, ScanCommand, QueryCommand, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

/**
 * Prismaで論理削除フィルターを追加
 */
export const withoutDeleted = (where: any = {}) => ({
  ...where,
  deleted_at: null
});

/**
 * Prisma論理削除実行
 */
export const softDeletePrisma = async (prisma: PrismaClient, model: any, where: any) => {
  return await model.update({
    where,
    data: {
      deleted_at: new Date(),
      updated_at: new Date()
    }
  });
};

/**
 * DynamoDBスキャンに論理削除フィルターを追加
 */
export const scanWithoutDeleted = async (
  client: DynamoDBDocumentClient, 
  params: any
) => {
  const filterExpression = params.FilterExpression 
    ? `${params.FilterExpression} AND (attribute_not_exists(deleted_at) OR deleted_at = :null_value)`
    : '(attribute_not_exists(deleted_at) OR deleted_at = :null_value)';
  
  const expressionAttributeValues = {
    ...params.ExpressionAttributeValues,
    ':null_value': null
  };

  return await client.send(new ScanCommand({
    ...params,
    FilterExpression: filterExpression,
    ExpressionAttributeValues: expressionAttributeValues
  }));
};

/**
 * DynamoDBクエリに論理削除フィルターを追加
 */
export const queryWithoutDeleted = async (
  client: DynamoDBDocumentClient, 
  params: any
) => {
  const filterExpression = params.FilterExpression 
    ? `${params.FilterExpression} AND (attribute_not_exists(deleted_at) OR deleted_at = :null_value)`
    : '(attribute_not_exists(deleted_at) OR deleted_at = :null_value)';
  
  const expressionAttributeValues = {
    ...params.ExpressionAttributeValues,
    ':null_value': null
  };

  return await client.send(new QueryCommand({
    ...params,
    FilterExpression: filterExpression,
    ExpressionAttributeValues: expressionAttributeValues
  }));
};

/**
 * DynamoDB論理削除実行
 */
export const softDeleteDynamo = async (
  client: DynamoDBDocumentClient,
  tableName: string,
  key: any
) => {
  return await client.send(new UpdateCommand({
    TableName: tableName,
    Key: key,
    UpdateExpression: 'SET deleted_at = :deleted_at, updated_at = :updated_at',
    ExpressionAttributeValues: {
      ':deleted_at': new Date().toISOString(),
      ':updated_at': new Date().toISOString()
    }
  }));
}; 