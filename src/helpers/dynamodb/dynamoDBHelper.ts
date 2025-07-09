import {
  CreateTableCommand,
  DescribeTableCommand,
  DynamoDBClient,
  KeyType,
  ResourceNotFoundException,
  ScalarAttributeType,
} from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand, QueryCommand, UpdateCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { validateTableData, validateTableKeys } from '@src/utils/schemaValidation';
import { getSchemaByTableName } from '@src/schemas/dynamoSchemas';

export const createTableIfNotExists = async (ddbDocClient: DynamoDBClient, tableName: string) => {
  try {
    await ddbDocClient.send(new DescribeTableCommand({ TableName: tableName }));
  } catch (error) {
    if (error instanceof ResourceNotFoundException) {
      await createTable(ddbDocClient, tableName);
    } else {
      throw error;
    }
  }
};

const createTable = async (ddbDocClient: DynamoDBClient, tableName: string) => {
  try {
    const createParams = {
      TableName: tableName,
      AttributeDefinitions: [{ AttributeName: 'UserId', AttributeType: ScalarAttributeType.S }],
      KeySchema: [{ AttributeName: 'UserId', KeyType: KeyType.HASH }],
      ProvisionedThroughput: {
        ReadCapacityUnits: 5,
        WriteCapacityUnits: 5,
      },
    };
    await ddbDocClient.send(new CreateTableCommand(createParams));
    await waitForTableToBecomeActive(ddbDocClient, tableName);
  } catch (err) {
    console.error('Error creating table:', err);
    throw err;
  }
};

const waitForTableToBecomeActive = async (
  ddbDocClient: DynamoDBClient,
  tableName: string,
): Promise<void> => {
  const maxAttempts = 10;
  const delay = 5000; // 5 seconds
  let attempts = 0;

  while (attempts < maxAttempts) {
    const { Table } = await ddbDocClient.send(new DescribeTableCommand({ TableName: tableName }));
    const tableStatus = Table?.TableStatus;

    if (tableStatus === 'ACTIVE') {
      console.log(`✅ Table "${tableName}" is ACTIVE.`);
      return;
    }

    console.log(
      `⏳ Waiting for table "${tableName}" to become ACTIVE. Current status: ${tableStatus}`,
    );
    await new Promise((resolve) => setTimeout(resolve, delay));
    attempts++;
  }

  throw new Error(`❌ Table "${tableName}" did not become ACTIVE after ${maxAttempts} attempts.`);
};

export class DynamoDBRepository {
  static ddbDocClient: DynamoDBDocumentClient;

  // Initialize the DynamoDBDocumentClient with DynamoDBClient
  static initialize() {
    console.log('hello', 'register');
    const dynamoDBClient = new DynamoDBClient({});
    this.ddbDocClient = DynamoDBDocumentClient.from(dynamoDBClient);
  }

  static getDynamoDBClient() {
    return this.ddbDocClient;
  }
}

/**
 * スキーマ検証付きDynamoDBヘルパー関数
 */
export class SchemaValidatedDynamoDBHelper {
  constructor(private ddbDocClient: DynamoDBDocumentClient) {}

  /**
   * スキーマ検証付きアイテム作成
   */
  async putItem(
    tableKey: string,
    tableName: string,
    item: Record<string, any>,
    skipValidation: boolean = false
  ): Promise<void> {
    if (!skipValidation) {
      const validation = validateTableData(tableKey, item);
      if (!validation.isValid) {
        throw new Error(
          `Schema validation failed for table ${tableKey}: ${JSON.stringify(validation.errors, null, 2)}`
        );
      }

      const keyValidation = validateTableKeys(tableKey, item);
      if (!keyValidation.isValid) {
        throw new Error(
          `Key validation failed for table ${tableKey}: Missing keys ${keyValidation.missingKeys.join(', ')}`
        );
      }
    }

    const command = new PutCommand({
      TableName: tableName,
      Item: item,
    });

    await this.ddbDocClient.send(command);
  }

  /**
   * アイテム取得
   */
  async getItem(
    tableKey: string,
    tableName: string,
    keys: Record<string, any>
  ): Promise<Record<string, any> | undefined> {
    const schema = getSchemaByTableName(tableKey);
    if (!schema) {
      throw new Error(`Schema not found for table: ${tableKey}`);
    }

    const command = new GetCommand({
      TableName: tableName,
      Key: {
        [schema.keys.partitionKey]: keys[schema.keys.partitionKey],
        [schema.keys.sortKey]: keys[schema.keys.sortKey],
      },
    });

    const result = await this.ddbDocClient.send(command);
    return result.Item;
  }

  /**
   * クエリ実行（パーティションキーでの検索）
   */
  async queryItems(
    tableKey: string,
    tableName: string,
    partitionKeyValue: string,
    sortKeyCondition?: {
      operator: 'begins_with' | 'between' | '=' | '<' | '<=' | '>' | '>=';
      value: string | [string, string];
    }
  ): Promise<Record<string, any>[]> {
    const schema = getSchemaByTableName(tableKey);
    if (!schema) {
      throw new Error(`Schema not found for table: ${tableKey}`);
    }

    let keyConditionExpression = `${schema.keys.partitionKey} = :pk`;
    const expressionAttributeValues: Record<string, any> = {
      ':pk': partitionKeyValue,
    };

    if (sortKeyCondition) {
      switch (sortKeyCondition.operator) {
        case 'begins_with':
          keyConditionExpression += ` AND begins_with(${schema.keys.sortKey}, :sk)`;
          expressionAttributeValues[':sk'] = sortKeyCondition.value;
          break;
        case 'between':
          keyConditionExpression += ` AND ${schema.keys.sortKey} BETWEEN :sk1 AND :sk2`;
          const [start, end] = sortKeyCondition.value as [string, string];
          expressionAttributeValues[':sk1'] = start;
          expressionAttributeValues[':sk2'] = end;
          break;
        case '=':
          keyConditionExpression += ` AND ${schema.keys.sortKey} = :sk`;
          expressionAttributeValues[':sk'] = sortKeyCondition.value;
          break;
        case '<':
          keyConditionExpression += ` AND ${schema.keys.sortKey} < :sk`;
          expressionAttributeValues[':sk'] = sortKeyCondition.value;
          break;
        case '<=':
          keyConditionExpression += ` AND ${schema.keys.sortKey} <= :sk`;
          expressionAttributeValues[':sk'] = sortKeyCondition.value;
          break;
        case '>':
          keyConditionExpression += ` AND ${schema.keys.sortKey} > :sk`;
          expressionAttributeValues[':sk'] = sortKeyCondition.value;
          break;
        case '>=':
          keyConditionExpression += ` AND ${schema.keys.sortKey} >= :sk`;
          expressionAttributeValues[':sk'] = sortKeyCondition.value;
          break;
      }
    }

    const command = new QueryCommand({
      TableName: tableName,
      KeyConditionExpression: keyConditionExpression,
      ExpressionAttributeValues: expressionAttributeValues,
    });

    const result = await this.ddbDocClient.send(command);
    return result.Items || [];
  }

  /**
   * スキーマ検証付きアイテム更新
   */
  async updateItem(
    tableKey: string,
    tableName: string,
    keys: Record<string, any>,
    updateData: Record<string, any>,
    skipValidation: boolean = false
  ): Promise<void> {
    if (!skipValidation) {
      // 更新データのみを検証（全体データではない）
      const allowedFields = getSchemaByTableName(tableKey);
      if (allowedFields) {
        const allFields = [...allowedFields.requiredFields, ...allowedFields.optionalFields];
        const invalidFields = Object.keys(updateData).filter(field => !allFields.includes(field));
        if (invalidFields.length > 0) {
          throw new Error(`Invalid fields for table ${tableKey}: ${invalidFields.join(', ')}`);
        }
      }
    }

    const schema = getSchemaByTableName(tableKey);
    if (!schema) {
      throw new Error(`Schema not found for table: ${tableKey}`);
    }

    // UpdateExpressionを動的に構築
    const updateExpressions: string[] = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, any> = {};

    Object.entries(updateData).forEach(([key, value], index) => {
      const attrName = `#attr${index}`;
      const attrValue = `:val${index}`;
      
      updateExpressions.push(`${attrName} = ${attrValue}`);
      expressionAttributeNames[attrName] = key;
      expressionAttributeValues[attrValue] = value;
    });

    const command = new UpdateCommand({
      TableName: tableName,
      Key: {
        [schema.keys.partitionKey]: keys[schema.keys.partitionKey],
        [schema.keys.sortKey]: keys[schema.keys.sortKey],
      },
      UpdateExpression: `SET ${updateExpressions.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
    });

    await this.ddbDocClient.send(command);
  }

  /**
   * アイテム削除
   */
  async deleteItem(
    tableKey: string,
    tableName: string,
    keys: Record<string, any>
  ): Promise<void> {
    const schema = getSchemaByTableName(tableKey);
    if (!schema) {
      throw new Error(`Schema not found for table: ${tableKey}`);
    }

    const command = new DeleteCommand({
      TableName: tableName,
      Key: {
        [schema.keys.partitionKey]: keys[schema.keys.partitionKey],
        [schema.keys.sortKey]: keys[schema.keys.sortKey],
      },
    });

    await this.ddbDocClient.send(command);
  }

  /**
   * バッチ書き込み（複数アイテムの一括作成）
   */
  async batchPutItems(
    tableKey: string,
    tableName: string,
    items: Record<string, any>[],
    skipValidation: boolean = false
  ): Promise<void> {
    if (!skipValidation) {
      for (const item of items) {
        const validation = validateTableData(tableKey, item);
        if (!validation.isValid) {
          throw new Error(
            `Schema validation failed for table ${tableKey}: ${JSON.stringify(validation.errors, null, 2)}`
          );
        }
      }
    }

    // DynamoDBのバッチ書き込みは25件まで
    const batchSize = 25;
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      const putRequests = batch.map(item => ({
        PutRequest: {
          Item: item,
        },
      }));

      const { BatchWriteItemCommand } = await import('@aws-sdk/client-dynamodb');
      const command = new BatchWriteItemCommand({
        RequestItems: {
          [tableName]: putRequests,
        },
      });

      await this.ddbDocClient.send(command);
    }
  }
}
