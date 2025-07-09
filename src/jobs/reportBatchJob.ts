import cron from 'node-cron';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { processBatchReportSettings } from '@src/services/batchService';

/**
 * バッチレポート処理のcronジョブを開始
 */
export const startReportBatchJob = (ddbDocClient: DynamoDBDocumentClient) => {
  // 毎時0分に実行
  cron.schedule('0 * * * *', async () => {
    const currentTime = new Date().toISOString();
    console.log(`[ReportBatchJob] Starting batch report processing at ${currentTime}`);
    
    try {
      await processBatchReportSettings(ddbDocClient);
      console.log(`[ReportBatchJob] Batch report processing completed successfully at ${new Date().toISOString()}`);
    } catch (error) {
      console.error(`[ReportBatchJob] Batch report processing failed at ${new Date().toISOString()}:`, error);
    }
  }, {
    timezone: 'Asia/Tokyo' // 日本時間で実行
  });

  console.log('[ReportBatchJob] Report batch cron job started (runs every hour at minute 0)');
};

/**
 * テスト用：手動でバッチ処理を実行
 */
export const runBatchManually = async (ddbDocClient: DynamoDBDocumentClient) => {
  console.log('[ReportBatchJob] Running batch report processing manually...');
  
  try {
    await processBatchReportSettings(ddbDocClient);
    console.log('[ReportBatchJob] Manual batch report processing completed successfully');
  } catch (error) {
    console.error('[ReportBatchJob] Manual batch report processing failed:', error);
    throw error;
  }
}; 