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
import { queryWithoutDeleted, scanWithoutDeleted, softDeleteDynamo } from '@src/utils/softDelete';

// 日本時間（JST）での現在時刻を取得
const getJSTDate = (): Date => {
  const now = new Date();
  // 日本時間（UTC+9）に変換
  return new Date(now.getTime() + (9 * 60 * 60 * 1000));
};

// 指定したweekdayの次の日付を日本時間で返す（0=日曜, 1=月曜...）
const calculateNextWeekday = (weekday: number): Date => {
  const today = getJSTDate();
  const currentWeekday = today.getUTCDay(); // JST調整済みなのでUTCで取得
  let daysToAdd = weekday - currentWeekday;
  if (daysToAdd <= 0) daysToAdd += 7;
  const nextDate = new Date(today);
  nextDate.setUTCDate(today.getUTCDate() + daysToAdd);
  return nextDate;
};

/**
 * バッチレポート設定を作成
 */
export const createBatchReportSetting = async (
  ddbDocClient: DynamoDBDocumentClient,
  client_id: string,
  employee_id: string,
  request: CreateBatchReportSettingRequest,
): Promise<BatchReportSetting> => {
  // 既存のバッチ設定をチェック
  const existingBatch = await getBatchReportSettingByProperty(
    ddbDocClient,
    client_id,
    request.property_id
  );

  if (existingBatch) {
    throw new Error('この物件の報告書自動出力設定はすでに存在します。');
  }

  const id = uuidv4();
  const now = new Date().toISOString();
  
  // 物件名は後で更新可能なので、ここではスキップ
  const property_name = '';
  
  // ログ出力: リクエスト内容
  console.log('[createBatchReportSetting] request:', request);
  
  // weekdayから開始日を日本時間で計算
  const startDate = calculateNextWeekday(Number(request.weekday));
  const executionTime = request.execution_time ?? '01:00';
  const [hours, minutes] = executionTime.split(':').map(Number);
  
  // 日本時間での実行時刻を設定
  const nextExecutionDate = new Date(startDate);
  nextExecutionDate.setUTCHours(hours, minutes, 0, 0);

  // ログ出力: 計算結果
  console.log('[createBatchReportSetting] JST executionTime:', executionTime, 'hours:', hours, 'minutes:', minutes);
  console.log('[createBatchReportSetting] JST startDate:', startDate.toISOString());
  console.log('[createBatchReportSetting] JST nextExecutionDate:', nextExecutionDate.toISOString());
  
  const batchSetting: BatchReportSetting = {
    id,
    client_id,
    property_id: request.property_id,
    property_name, // 物件名を保存
    weekday: request.weekday, // 文字列で保存
    start_date: startDate.toISOString().split('T')[0], // 計算された開始日
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
  const item = result.Item as BatchReportSetting;
  
  // 論理削除済みの場合はnullを返す
  if (item && item.deleted_at) {
    return null;
  }
  
  return item || null;
};

/**
 * クライアントの全バッチレポート設定を取得
 */
export const getBatchReportSettingsByClient = async (
  ddbDocClient: DynamoDBDocumentClient,
  client_id: string,
): Promise<BatchReportSetting[]> => {
  const queryParams = {
    TableName: config.tableNames.batchReportSettings,
    KeyConditionExpression: 'client_id = :client_id',
    ExpressionAttributeValues: {
      ':client_id': client_id,
    },
  };

  const result = await queryWithoutDeleted(ddbDocClient, queryParams);
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
  const queryParams = {
    TableName: config.tableNames.batchReportSettings,
    KeyConditionExpression: 'client_id = :client_id',
    FilterExpression: 'property_id = :property_id',
    ExpressionAttributeValues: {
      ':client_id': client_id,
      ':property_id': property_id,
    },
  };

  const result = await queryWithoutDeleted(ddbDocClient, queryParams);
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
  // 論理削除を実行
  await softDeleteDynamo(ddbDocClient, config.tableNames.batchReportSettings, {
    client_id,
    created_at,
  });
  
  console.log(`Successfully soft deleted batch report setting: ${client_id}/${created_at}`);
};

/**
 * 実行すべきバッチレポート設定を検索
 * 現在時刻から過去1時間以内に実行予定だったバッチを取得
 */
export const getExecutableBatchSettings = async (
  ddbDocClient: DynamoDBDocumentClient,
  currentDateTime: string,
): Promise<BatchExecutionTarget[]> => {
  // 1時間前の時刻を計算（入力のcurrentDateTimeは既に日本時間）
  const currentTime = new Date(currentDateTime);
  const oneHourAgo = new Date(currentTime.getTime() - 60 * 60 * 1000); // 1時間前

  console.log(`[getExecutableBatchSettings] JST time window: ${oneHourAgo.toISOString()} to ${currentDateTime}`);

  const scanParams = {
    TableName: config.tableNames.batchReportSettings,
    FilterExpression: '#status = :status AND next_execution_date > :oneHourAgo AND next_execution_date <= :currentDateTime',
    ExpressionAttributeNames: {
      '#status': 'status',
    },
    ExpressionAttributeValues: {
      ':status': 'active',
      ':oneHourAgo': oneHourAgo.toISOString(),
      ':currentDateTime': currentDateTime,
    },
  };

  const result = await scanWithoutDeleted(ddbDocClient, scanParams);
  const batches = (result.Items as BatchExecutionTarget[]) || [];
  
  console.log(`[getExecutableBatchSettings] Found ${batches.length} executable batches`);
  batches.forEach(batch => {
    console.log(`  - Batch ${batch.id}: execution_time=${batch.execution_time}, next_execution_date=${batch.next_execution_date}`);
  });
  
  return batches;
};

/**
 * バッチ実行後に次回実行日時を更新
 */
export const updateNextExecutionDate = async (
  ddbDocClient: DynamoDBDocumentClient,
  client_id: string,
  created_at: string,
  weekday: number, // 追加
  auto_create_period: AutoCreatePeriod,
  current_execution_date: string,
): Promise<void> => {
  // 現在の実行日から次回の同じ曜日を日本時間で計算
  const currentDate = new Date(current_execution_date);
  const nextDate = new Date(currentDate);
  
  if (auto_create_period === '1週間ごと') {
    nextDate.setUTCDate(currentDate.getUTCDate() + 7);
  } else if (auto_create_period === '2週間ごと') {
    nextDate.setUTCDate(currentDate.getUTCDate() + 14);
  }

  // 指定曜日に調整（日本時間基準）
  const targetWeekday = weekday;
  const currentWeekday = nextDate.getUTCDay(); // JST調整済みなのでUTCで取得
  const adjustment = targetWeekday - currentWeekday;
  if (adjustment !== 0) {
    nextDate.setUTCDate(nextDate.getUTCDate() + adjustment);
  }

  console.log(`[updateNextExecutionDate] JST current: ${current_execution_date}`);
  console.log(`[updateNextExecutionDate] JST next: ${nextDate.toISOString()}`);
  console.log(`[updateNextExecutionDate] weekday adjustment: ${adjustment} (target: ${targetWeekday}, current: ${currentWeekday})`);

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