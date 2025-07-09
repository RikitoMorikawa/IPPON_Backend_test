import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  UpdateCommand,
  DeleteCommand,
  ScanCommand,
  QueryCommand,
} from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import config from '@src/config';
import {
  BatchReportSetting,
  CreateBatchReportSettingRequest,
  UpdateBatchReportSettingRequest,
  BatchExecutionTarget,
  AutoCreatePeriod,
} from '@src/models/batchReportType';

/**
 * バッチレポート設定を作成
 */
export const createBatchReportSetting = async (
  ddbDocClient: DynamoDBDocumentClient,
  client_id: string,
  employee_id: string,
  request: CreateBatchReportSettingRequest,
): Promise<BatchReportSetting> => {
  const id = uuidv4();
  const now = new Date().toISOString();
  
  // 物件名は後で更新可能なので、ここではスキップ
  const property_name = '';
  
  // 次回実行日時を計算
  const startDate = new Date(request.start_date);
  const executionTime = request.execution_time || '01:00';
  const [hours, minutes] = executionTime.split(':').map(Number);
  
  const nextExecutionDate = new Date(startDate);
  nextExecutionDate.setHours(hours, minutes, 0, 0);
  
  const batchSetting: BatchReportSetting = {
    id,
    client_id,
    property_id: request.property_id,
    property_name, // 物件名を保存
    start_date: request.start_date,
    auto_create_period: request.auto_create_period,
    auto_generate: request.auto_generate,
    execution_time: executionTime,
    next_execution_date: nextExecutionDate.toISOString(),
    status: 'active',
    execution_count: 0,
    created_at: now,
    updated_at: now,
    employee_id,
  };

  const command = new PutCommand({
    TableName: config.tableNames.batchReportSettings,
    Item: batchSetting,
  });

  await ddbDocClient.send(command);
  return batchSetting;
};

/**
 * バッチレポート設定を取得
 */
export const getBatchReportSetting = async (
  ddbDocClient: DynamoDBDocumentClient,
  client_id: string,
  created_at: string,
): Promise<BatchReportSetting | null> => {
  const command = new GetCommand({
    TableName: config.tableNames.batchReportSettings,
    Key: {
      client_id,
      created_at,
    },
  });

  const result = await ddbDocClient.send(command);
  return result.Item as BatchReportSetting || null;
};

/**
 * クライアントの全バッチレポート設定を取得
 */
export const getBatchReportSettingsByClient = async (
  ddbDocClient: DynamoDBDocumentClient,
  client_id: string,
): Promise<BatchReportSetting[]> => {
  const command = new QueryCommand({
    TableName: config.tableNames.batchReportSettings,
    KeyConditionExpression: 'client_id = :client_id',
    ExpressionAttributeValues: {
      ':client_id': client_id,
    },
  });

  const result = await ddbDocClient.send(command);
  return (result.Items as BatchReportSetting[]) || [];
};

/**
 * 特定の物件のバッチレポート設定を取得
 */
export const getBatchReportSettingByProperty = async (
  ddbDocClient: DynamoDBDocumentClient,
  client_id: string,
  property_id: string,
): Promise<BatchReportSetting | null> => {
  const command = new QueryCommand({
    TableName: config.tableNames.batchReportSettings,
    KeyConditionExpression: 'client_id = :client_id',
    FilterExpression: 'property_id = :property_id',
    ExpressionAttributeValues: {
      ':client_id': client_id,
      ':property_id': property_id,
    },
  });

  const result = await ddbDocClient.send(command);
  const settings = (result.Items as BatchReportSetting[]) || [];
  
  // 最新の設定を返す（created_atでソート）
  if (settings.length > 0) {
    settings.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return settings[0];
  }
  
  return null;
};

/**
 * バッチレポート設定を更新
 */
export const updateBatchReportSetting = async (
  ddbDocClient: DynamoDBDocumentClient,
  client_id: string,
  created_at: string,
  updates: UpdateBatchReportSettingRequest,
): Promise<BatchReportSetting> => {
  const updateExpressions: string[] = [];
  const expressionAttributeValues: Record<string, any> = {};
  const expressionAttributeNames: Record<string, string> = {};

  // 更新フィールドを動的に構築
  Object.entries(updates).forEach(([key, value]) => {
    if (value !== undefined) {
      const attrKey = `#${key}`;
      const valKey = `:${key}`;
      updateExpressions.push(`${attrKey} = ${valKey}`);
      expressionAttributeNames[attrKey] = key;
      expressionAttributeValues[valKey] = value;
    }
  });

  // updated_atを自動追加
  updateExpressions.push('#updated_at = :updated_at');
  expressionAttributeNames['#updated_at'] = 'updated_at';
  expressionAttributeValues[':updated_at'] = new Date().toISOString();

  const command = new UpdateCommand({
    TableName: config.tableNames.batchReportSettings,
    Key: {
      client_id,
      created_at,
    },
    UpdateExpression: `SET ${updateExpressions.join(', ')}`,
    ExpressionAttributeNames: expressionAttributeNames,
    ExpressionAttributeValues: expressionAttributeValues,
    ReturnValues: 'ALL_NEW',
  });

  const result = await ddbDocClient.send(command);
  return result.Attributes as BatchReportSetting;
};

/**
 * バッチレポート設定を削除
 */
export const deleteBatchReportSetting = async (
  ddbDocClient: DynamoDBDocumentClient,
  client_id: string,
  created_at: string,
): Promise<void> => {
  const command = new DeleteCommand({
    TableName: config.tableNames.batchReportSettings,
    Key: {
      client_id,
      created_at,
    },
  });

  await ddbDocClient.send(command);
};

/**
 * 実行すべきバッチレポート設定を検索
 */
export const getExecutableBatchSettings = async (
  ddbDocClient: DynamoDBDocumentClient,
  currentDateTime: string,
): Promise<BatchExecutionTarget[]> => {
  const command = new ScanCommand({
    TableName: config.tableNames.batchReportSettings,
    FilterExpression: '#status = :status AND next_execution_date <= :currentDateTime',
    ExpressionAttributeNames: {
      '#status': 'status',
    },
    ExpressionAttributeValues: {
      ':status': 'active',
      ':currentDateTime': currentDateTime,
    },
  });

  const result = await ddbDocClient.send(command);
  return (result.Items as BatchExecutionTarget[]) || [];
};

/**
 * バッチ実行後に次回実行日時を更新
 */
export const updateNextExecutionDate = async (
  ddbDocClient: DynamoDBDocumentClient,
  client_id: string,
  created_at: string,
  auto_create_period: AutoCreatePeriod,
  current_execution_date: string,
): Promise<void> => {
  // 次回実行日時を計算
  const currentDate = new Date(current_execution_date);
  const nextDate = new Date(currentDate);
  
  if (auto_create_period === '1週間ごと') {
    nextDate.setDate(currentDate.getDate() + 7);
  } else if (auto_create_period === '2週間ごと') {
    nextDate.setDate(currentDate.getDate() + 14);
  }

  const command = new UpdateCommand({
    TableName: config.tableNames.batchReportSettings,
    Key: {
      client_id,
      created_at,
    },
    UpdateExpression: 'SET next_execution_date = :next_execution_date, last_execution_date = :last_execution_date, execution_count = execution_count + :increment, updated_at = :updated_at',
    ExpressionAttributeValues: {
      ':next_execution_date': nextDate.toISOString(),
      ':last_execution_date': current_execution_date,
      ':increment': 1,
      ':updated_at': new Date().toISOString(),
    },
  });

  await ddbDocClient.send(command);
}; 