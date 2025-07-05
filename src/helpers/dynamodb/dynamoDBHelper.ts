import {
  CreateTableCommand,
  DescribeTableCommand,
  DynamoDBClient,
  KeyType,
  ResourceNotFoundException,
  ScalarAttributeType,
} from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

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
