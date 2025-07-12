import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';
import * as reportModel from '@src/repositroies/reportModel';
import * as batchReportModel from '@src/repositroies/batchReportModel';
import * as reportService from '@src/services/reportService';
import config from '@src/config';
import { BatchExecutionTarget } from '@src/models/batchReportType';
import { scanWithoutDeleted } from '@src/utils/softDelete';

// 日本時間（JST）での現在時刻を取得
const getJSTCurrentDateTime = (): string => {
  const now = new Date();
  // 日本時間（UTC+9）に変換
  const jstTime = new Date(now.getTime() + (9 * 60 * 60 * 1000));
  return jstTime.toISOString();
};

/**
 * バッチレポート処理を実行
 */
export const processBatchReportSettings = async (
  ddbDocClient: DynamoDBDocumentClient,
): Promise<void> => {
  const currentDateTime = getJSTCurrentDateTime();
  console.log(`[BatchService] Processing batch reports at JST: ${currentDateTime}`);

  try {
    // 実行すべきバッチ設定を取得
    const executableBatches = await batchReportModel.getExecutableBatchSettings(
      ddbDocClient,
      currentDateTime
    );

    console.log(`[BatchService] Found ${executableBatches.length} batches to process`);

    if (executableBatches.length === 0) {
      console.log('[BatchService] No batches to process at this time');
      return;
    }

    // 各バッチを並列処理
    const promises = executableBatches.map(batch => 
      processSingleBatch(ddbDocClient, batch)
    );

    await Promise.allSettled(promises);
    
    console.log(`[BatchService] Batch processing completed`);
  } catch (error) {
    console.error('[BatchService] Error in batch processing:', error);
    throw error;
  }
};

/**
 * 単一のバッチ設定を処理
 */
const processSingleBatch = async (
  ddbDocClient: DynamoDBDocumentClient,
  batch: BatchExecutionTarget
): Promise<void> => {
  console.log(`[BatchService] Processing batch ${batch.id} for property ${batch.property_id}`);

  try {
    // 期間計算 - 実行日から過去の期間を計算
    const executionDate = new Date(batch.next_execution_date);
    const endDate = new Date(executionDate);
    const startDate = new Date(executionDate);
    
    if (batch.auto_create_period === '1週間ごと') {
      startDate.setDate(executionDate.getDate() - 7);
    } else if (batch.auto_create_period === '2週間ごと') {
      startDate.setDate(executionDate.getDate() - 14);
    }

    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    console.log(`[BatchService] Processing period: ${startDateStr} to ${endDateStr} for property ${batch.property_id}`);

    // 期間内の問い合わせを取得
    const inquiriesResult = await reportService.getInquiriesForPeriod(
      ddbDocClient,
      batch.client_id,
      batch.property_id,
      startDateStr,
      endDateStr
    );

    // 物件情報を取得
    const propertyResult = await scanWithoutDeleted(ddbDocClient, {
      TableName: config.tableNames.properties,
      FilterExpression: 'id = :id AND client_id = :client_id',
      ExpressionAttributeValues: {
        ':id': batch.property_id,
        ':client_id': batch.client_id
      }
    });

    if (!propertyResult.Items || propertyResult.Items.length === 0) {
      console.warn(`[BatchService] Property not found: ${batch.property_id}`);
      return;
    }

    const property = propertyResult.Items[0];

    if (batch.auto_generate && inquiriesResult.inquiries.length > 0) {
      // AI処理でレポート作成
      const createReportData = {
        property_id: batch.property_id,
        property_name: batch.property_name || property.name || '',
        report_start_date: startDateStr,
        report_end_date: endDateStr,
        customer_interactions: inquiriesResult.inquiries.map((inquiry: any) => ({
          customer_id: inquiry.customer_id || inquiry.customer?.customer_id,
          customer_name: inquiry.customer?.last_name + inquiry.customer?.first_name || '不明',
          inquired_at: inquiry.inquired_at,
          category: inquiry.category || 'inquiry',
          type: inquiry.type || 'email',
          title: inquiry.title || '問い合わせ',
          summary: inquiry.summary || ''
        }))
      };

      const report = await reportService.createReport(
        createReportData,
        batch.client_id,
        ddbDocClient
      );

      console.log(`[BatchService] Created report ${report.id} for batch ${batch.id}`);
    } else {
      console.log(`[BatchService] Skipping report creation for batch ${batch.id} (auto_generate: ${batch.auto_generate}, inquiries: ${inquiriesResult.inquiries.length})`);
    }

    // 次回実行日時を更新
    await batchReportModel.updateNextExecutionDate(
      ddbDocClient,
      batch.client_id,
      batch.created_at,
      batch.weekday, // 追加
      batch.auto_create_period,
      batch.next_execution_date
    );

    console.log(`[BatchService] Updated next execution date for batch ${batch.id}`);
  } catch (error) {
    console.error(`[BatchService] Error processing single batch ${batch.id}:`, error);
    throw error;
  }
}; 