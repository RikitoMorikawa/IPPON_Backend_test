import { ScanCommand, QueryCommand, ScanCommandInput, QueryCommandInput } from '@aws-sdk/lib-dynamodb';

/**
 * DynamoDBのScanコマンドにテナントIDフィルタを追加するヘルパー関数
 */
export function addTenantFilterToScan(
  params: ScanCommandInput,
  tenantId: string
): ScanCommandInput {
  const updatedParams = { ...params };
  
  // FilterExpressionとExpressionAttributeValuesを初期化
  if (!updatedParams.ExpressionAttributeValues) {
    updatedParams.ExpressionAttributeValues = {};
  }
  
  // テナントIDをフィルタに追加
  updatedParams.ExpressionAttributeValues[':tenantId'] = tenantId;
  
  if (updatedParams.FilterExpression) {
    // 既存のFilterExpressionがある場合はANDで結合
    updatedParams.FilterExpression = `client_id = :tenantId AND (${updatedParams.FilterExpression})`;
  } else {
    // FilterExpressionがない場合は新規作成
    updatedParams.FilterExpression = 'client_id = :tenantId';
  }
  
  return updatedParams;
}

/**
 * DynamoDBのQueryコマンドにテナントIDフィルタを追加するヘルパー関数
 */
export function addTenantFilterToQuery(
  params: QueryCommandInput,
  tenantId: string
): QueryCommandInput {
  const updatedParams = { ...params };
  
  // ExpressionAttributeValuesを初期化
  if (!updatedParams.ExpressionAttributeValues) {
    updatedParams.ExpressionAttributeValues = {};
  }
  
  // テナントIDをフィルタに追加
  updatedParams.ExpressionAttributeValues[':tenantId'] = tenantId;
  
  if (updatedParams.FilterExpression) {
    // 既存のFilterExpressionがある場合はANDで結合
    updatedParams.FilterExpression = `client_id = :tenantId AND (${updatedParams.FilterExpression})`;
  } else {
    // FilterExpressionがない場合は新規作成
    updatedParams.FilterExpression = 'client_id = :tenantId';
  }
  
  return updatedParams;
}

/**
 * テナントIDが一致するかチェックするヘルパー関数
 */
export function validateTenantId(itemTenantId: string, requestTenantId: string): boolean {
  return itemTenantId === requestTenantId;
}

/**
 * アイテムの配列からテナントIDでフィルタリングするヘルパー関数
 */
export function filterItemsByTenantId<T extends { client_id: string }>(
  items: T[],
  tenantId: string
): T[] {
  return items.filter(item => item.client_id === tenantId);
} 