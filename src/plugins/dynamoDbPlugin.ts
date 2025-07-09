import {
  DynamoDBClient,
  CreateTableCommand,
  DescribeTableCommand,
  ResourceNotFoundException,
} from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import fp from 'fastify-plugin';
import config from '@src/config';
import { tableKeyStructures, DynamoDBSchemas, getSchemaByTableName } from '@src/schemas/dynamoSchemas';

const dynamoDbPlugin = fp(async (app) => {
  try {
    app.log.info(`Initializing DynamoDB with endpoint: ${config.dynamoConfig.endpoint}`);
    const dynamoClient = new DynamoDBClient({
      region: config.dynamoConfig.region,
      endpoint: config.dynamoConfig.endpoint,
      credentials: {
        accessKeyId: config.aws.accessKeyId || 'dummyAccessKeyId',
        secretAccessKey: config.aws.secretAccessKey || 'dummySecretAccessKey',
      },
    });

    const ddbDocClient = DynamoDBDocumentClient.from(dynamoClient, {
      marshallOptions: {
        removeUndefinedValues: true,
      },
    });
    app.decorate('ddbDocClient', ddbDocClient);

    app.log.info('DynamoDB Client and Document Client attached to Fastify instance');

    const checkTableExists = async (tableName: string): Promise<boolean> => {
      try {
        await ddbDocClient.send(new DescribeTableCommand({ TableName: tableName }));
        return true;
      } catch (error: any) {
        if (
          error instanceof ResourceNotFoundException ||
          error.name === 'ResourceNotFoundException'
        ) {
          return false;
        }
        throw error;
      }
    };

    const createTable = async (tableConfig: any) => {
      app.log.info(`Creating table "${tableConfig.TableName}"...`);
      await ddbDocClient.send(new CreateTableCommand(tableConfig));
      app.log.info(`Table "${tableConfig.TableName}" created successfully.`);
    };

    // dynamoSchemas.tsの定義を使用してテーブルを作成
    for (const [configKey, tableName] of Object.entries(config.tableNames)) {
      app.log.info(`Checking if table "${tableName}" exists...`);
      const tableExists = await checkTableExists(tableName);

      if (!tableExists) {
        app.log.info(`Table "${tableName}" does not exist. Creating...`);

        // スキーマ定義を取得
        const schema = getSchemaByTableName(configKey);
        if (!schema) {
          app.log.error(`Schema not found for table: ${configKey}`);
          throw new Error(`Schema not found for table: ${configKey}`);
        }

        const { partitionKey, sortKey } = schema.keys;
        
        // Log schema information for debugging
        app.log.info(`Creating table "${tableName}" with PK: ${partitionKey}, SK: ${sortKey}`);
        app.log.info(`Schema description: ${schema.description}`);

        const tableConfig = {
          TableName: tableName,
          KeySchema: [
            { AttributeName: partitionKey, KeyType: 'HASH' },
            { AttributeName: sortKey, KeyType: 'RANGE' },
          ],
          AttributeDefinitions: [
            { AttributeName: partitionKey, AttributeType: 'S' },
            { AttributeName: sortKey, AttributeType: 'S' },
          ],
          ProvisionedThroughput: {
            ReadCapacityUnits: 5,
            WriteCapacityUnits: 5,
          },
        };

        await createTable(tableConfig);
        
        // スキーマ情報をログに出力（デバッグ用）
        app.log.info(`Table "${tableName}" created with schema:`);
        app.log.info(`- Required fields: ${schema.requiredFields.join(', ')}`);
        app.log.info(`- Optional fields: ${schema.optionalFields.join(', ')}`);
      } else {
        app.log.info(`Table "${tableName}" already exists.`);
      }
    }

    app.log.info('DynamoDB Local Client Initialized and ready');
  } catch (error: unknown) {
    if (error instanceof Error) {
      app.log.error(`Error initializing DynamoDB Client: ${error.message}`);
      app.log.error(`Stack Trace: ${error.stack}`);
      throw new Error(`DynamoDB initialization failed: ${error.message}`);
    } else {
      app.log.error('An unknown error occurred during DynamoDB initialization');
      throw new Error('Unknown error during DynamoDB initialization');
    }
  }
});

export default dynamoDbPlugin;
