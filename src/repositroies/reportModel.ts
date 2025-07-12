import {
  DynamoDBDocumentClient,
  QueryCommand,
  DeleteCommand,
  PutCommand,
  GetCommand,
  BatchWriteCommand,
} from '@aws-sdk/lib-dynamodb';
import { Report } from '@src/models/report';
import config from '@src/config';
import { getClientDataByClientId } from '@src/services/clientDataService';
import { ReportDetailData } from '@src/interfaces/reportInterfaces';
import { ReportStatus, REPORT_STATUSES } from '@src/enums/reportEnums';
import { CustomerInteraction } from '@src/models/reportType';
import { queryWithoutDeleted, softDeleteDynamo } from '@src/utils/softDelete';

export const getReportDetailsForAPI = async (
  ddbDocClient: DynamoDBDocumentClient,
  report_id: string,
  client_id: string,
): Promise<ReportDetailData | null> => {
  try {
    const reportParams = {
      TableName: config.tableNames.report,
      KeyConditionExpression: 'client_id = :client_id',
      FilterExpression: 'id = :report_id',
      ExpressionAttributeValues: {
        ':client_id': client_id,
        ':report_id': report_id,
      },
    };

    const reportResult = await queryWithoutDeleted(ddbDocClient, reportParams);

    const reportData = reportResult.Items?.[0] as Report;

    if (!reportData) {
      console.warn(`No report found for report_id: ${report_id}`);
      return null;
    }

    // Convert to ReportDetailData format
    const formattedCustomerInteractions: CustomerInteraction[] = (reportData.customer_interactions || []).map((interaction: any) => ({
      date: interaction.date || new Date().toISOString(),
      type: interaction.type || 'inquiry',
      customer_id: interaction.customer_id,
      customer_name: interaction.customer_name,
      content: interaction.content || '',
      category: interaction.category,
      title: interaction.title
    }));

    return {
      id: reportData.id || '',
      title: reportData.title || '',
      current_status: (reportData.current_status as ReportStatus) || REPORT_STATUSES.RECRUITING,
      summary: reportData.summary || '',
      property_id: reportData.property_id || '',
      is_suumo_published: reportData.is_suumo_published || false,
      views_count: reportData.views_count || 0,
      inquiries_count: reportData.inquiries_count || 0,
      business_meeting_count: reportData.business_meeting_count || 0,
      viewing_count: reportData.viewing_count || 0,
      created_at: reportData.created_at || new Date().toISOString(),
      customer_interactions: formattedCustomerInteractions
    };
  } catch (error) {
    console.error('Error in getReportDetailsForAPI model:', error);
    throw error;
  }
};

export const getReportDetails = async (
  ddbDocClient: DynamoDBDocumentClient,
  report_id: string,
  client_id: string,
): Promise<Report & { property?: any } | null> => {
  try {
    const reportParams = {
      TableName: config.tableNames.report,
      KeyConditionExpression: 'client_id = :client_id',
      FilterExpression: 'id = :report_id',
      ExpressionAttributeValues: {
        ':client_id': client_id,
        ':report_id': report_id,
      },
    };

    const reportResult = await queryWithoutDeleted(ddbDocClient, reportParams);

    const reportData = reportResult.Items?.[0] as Report;

    if (!reportData) {
      console.warn(`No report found for report_id: ${report_id}`);
      return null;
    }



    const propertyParams = {
      TableName: config.tableNames.properties,
      KeyConditionExpression: 'client_id = :client_id',
      FilterExpression: 'id = :id',
      ExpressionAttributeValues: {
        ':client_id': client_id,
        ':id': reportData.property_id,
      },
    };

    const propertyResult = await queryWithoutDeleted(ddbDocClient, propertyParams);

    const propertyData = propertyResult.Items?.[0];

    return {
      ...reportData,
      property: propertyData || null,
    };
  } catch (error) {
    console.error('Error in getReportDetails model:', error);
    throw error;
  }
};


export const getPropertyReports = async (
  ddbDocClient: DynamoDBDocumentClient,
  property_id: string,
  client_id: string,
  limit: number,
  startKey?: any,
): Promise<{ reports: Report[]; lastEvaluatedKey?: any; total: any }> => {
  try {
    const params = {
      TableName: config.tableNames.report,
      KeyConditionExpression: 'client_id = :client_id',
      FilterExpression: 'property_id = :property_id',
      ExpressionAttributeValues: {
        ':client_id': client_id,
        ':property_id': property_id,
      },
      Limit: limit,
      ScanIndexForward: false,
      ...(startKey && { ExclusiveStartKey: startKey }),
    };

    console.log('DynamoDB Query Params:', JSON.stringify(params, null, 2));

    const result = await queryWithoutDeleted(ddbDocClient, params);

    console.log('DynamoDB Query Result:', {
      itemsCount: result.Items?.length,
      hasLastEvaluatedKey: !!result.LastEvaluatedKey,
    });

    return {
      reports: result.Items as Report[],
      lastEvaluatedKey: result.LastEvaluatedKey,
      total: result.Items?.length,
    };
  } catch (error) {
    console.error('Error in getPropertyReports model:', error);
    throw error;
  }
};
export const getReportsByClientId = async (
  ddbDocClient: DynamoDBDocumentClient,
  client_id: string,
  limit: number,
  startKey?: any,
  period?: {
    start_date: string;
    end_date: string;
  },
  weekStartDay?: 'sunday' | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday',
): Promise<{ reports: Report[]; lastEvaluatedKey?: any; total: number }> => {
  try {
    const startDate = period ? new Date(period.start_date).toISOString().split('T')[0] : undefined;
    const endDate = period ? new Date(period.end_date).toISOString().split('T')[0] : undefined;

    const params: any = {
      TableName: config.tableNames.report,
      KeyConditionExpression: 'client_id = :client_id',
      // FIXED: Changed to reports that fall completely within the period
      FilterExpression: period
        ? '(report_start_date >= :start_date AND report_end_date <= :end_date)'
        : undefined,
      ExpressionAttributeValues: {
        ':client_id': client_id,
        ...(period && {
          ':start_date': startDate,
          ':end_date': endDate,
        }),
      },
      Limit: limit,
      ScanIndexForward: false,
      ...(startKey && { ExclusiveStartKey: startKey }),
    };

    // Query for paginated reports
    const result = await queryWithoutDeleted(ddbDocClient, params);

    // Query to get total count (ignoring Limit and ExclusiveStartKey)
    const countParams: any = {
      TableName: config.tableNames.report,
      KeyConditionExpression: 'client_id = :client_id',
      FilterExpression: params.FilterExpression,
      ExpressionAttributeValues: params.ExpressionAttributeValues,
      Select: 'COUNT',
    };
    const countResult = await queryWithoutDeleted(ddbDocClient, countParams);
    const total = countResult.Count ?? 0;

    let reports = result.Items as Report[];
    
    if (weekStartDay) {
      // Same sorting logic as before
      const weekStartDayMap: { [key: string]: number } = {
        sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
        thursday: 4, friday: 5, saturday: 6,
      };
      const targetDay = weekStartDayMap[weekStartDay];
      reports = reports.sort((a, b) => {
        const dateA = new Date(a.report_start_date || '');
        const dateB = new Date(b.report_start_date || '');
        const dayA = dateA.getDay();
        const dayB = dateB.getDay();
        const adjustedDayA = (dayA - targetDay + 7) % 7;
        const adjustedDayB = (dayB - targetDay + 7) % 7;
        if (adjustedDayA === adjustedDayB) return dateA.getTime() - dateB.getTime();
        return adjustedDayA - adjustedDayB;
      });
    }

    return {
      reports,
      lastEvaluatedKey: result.LastEvaluatedKey,
      total,
    };
  } catch (error) {
    console.error('Error in getReportsByClientId model:', error);
    throw error;
  }
};
export const deleteReport = async (
  ddbDocClient: DynamoDBDocumentClient,
  report_id: string,
  client_id: string,
): Promise<void> => {
  try {
    const report = await getReportDetails(ddbDocClient, report_id, client_id);
    if (!report) {
      throw new Error('Report not found');
    }

    // 論理削除を実行
    await softDeleteDynamo(ddbDocClient, config.tableNames.report, {
      client_id: client_id,
      created_at: report.created_at
    });
  } catch (error) {
    console.error('Error in deleteReport model:', error);
    throw error;
  }
};

/**
 * 複数レポートを削除
 */
export const deleteMultipleReports = async (
  ddbDocClient: DynamoDBDocumentClient,
  report_ids: string[],
  client_id: string,
): Promise<{
  deleted_count: number;
  not_found_ids: string[];
  errors: string[];
}> => {
  const result = {
    deleted_count: 0,
    not_found_ids: [] as string[],
    errors: [] as string[],
  };

  try {
    // 各レポートIDに対して詳細を取得
    const reportsToDelete: Array<{ report_id: string; created_at: string }> = [];
    
    for (const report_id of report_ids) {
      try {
        const report = await getReportDetails(ddbDocClient, report_id, client_id);
        if (report) {
          reportsToDelete.push({
            report_id,
            created_at: report.created_at
          });
        } else {
          result.not_found_ids.push(report_id);
        }
      } catch (error) {
        console.warn(`Report ${report_id} not found:`, error);
        result.not_found_ids.push(report_id);
      }
    }

    if (reportsToDelete.length === 0) {
      console.log('No reports found to delete');
      return result;
    }

    // 各レポートを論理削除
    for (const report of reportsToDelete) {
      try {
        await softDeleteDynamo(ddbDocClient, config.tableNames.report, {
          client_id: client_id,
          created_at: report.created_at
        });
        result.deleted_count++;
      } catch (error) {
        result.errors.push(`レポート${report.report_id}の削除に失敗しました: ${error}`);
      }
    }

    console.log(`Successfully deleted ${result.deleted_count} reports`);
    return result;
  } catch (error) {
    console.error('Error in deleteMultipleReports:', error);
    throw error;
  }
};

/**
 * 複数レポートのステータスを更新（is_draft=false, completed状態に）
 */
export const updateMultipleReportsStatus = async (
  ddbDocClient: DynamoDBDocumentClient,
  report_ids: string[],
  client_id: string,
): Promise<{
  updated_count: number;
  not_found_ids: string[];
  errors: string[];
}> => {
  const result = {
    updated_count: 0,
    not_found_ids: [] as string[],
    errors: [] as string[],
  };

  try {
    // 各レポートIDに対して詳細を取得・更新
    for (const report_id of report_ids) {
      try {
        const report = await getReportDetails(ddbDocClient, report_id, client_id);
        if (!report) {
          result.not_found_ids.push(report_id);
          continue;
        }

        // レポートを完了状態に更新
        const updatedReport: Report = {
          ...report,
          is_draft: false,
          current_status: 'completed', // または適切なステータス
          updated_at: new Date().toISOString()
        };

        await updateReport(ddbDocClient, updatedReport);
        result.updated_count++;
      } catch (error) {
        console.warn(`Failed to update report ${report_id}:`, error);
        result.errors.push(`レポート${report_id}の更新に失敗しました: ${error}`);
      }
    }

    console.log(`Successfully updated ${result.updated_count} reports status`);
    return result;
  } catch (error) {
    console.error('Error in updateMultipleReportsStatus:', error);
    throw error;
  }
};

export const createReport = async (
  ddbDocClient: DynamoDBDocumentClient,
  report: Report,
): Promise<void> => {
  try {
    const params = {
      TableName: config.tableNames.report,
      Item: report,
    };

    console.log('DynamoDB Create Params:', JSON.stringify(params, null, 2));

    const command = new PutCommand(params);
    await ddbDocClient.send(command);
  } catch (error) {
    console.error('Error in createReport model:', error);
    throw error;
  }
};

export const updateReport = async (
  ddbDocClient: DynamoDBDocumentClient,
  report: Report
): Promise<void> => {
  try {
    // First get the existing report to ensure we have the correct created_at
    const existingReport = await getReportDetails(ddbDocClient, report.id, report.client_id);
    if (!existingReport) {
      throw new Error('Report not found');
    }

    const params = {
      TableName: config.tableNames.report,
      Item: {
        ...report,
        created_at: existingReport.created_at // Preserve the original created_at
      }
    };

    console.log('DynamoDB Update Params:', JSON.stringify(params, null, 2));

    const command = new PutCommand(params);
    await ddbDocClient.send(command);
  } catch (error) {
    console.error('Error in updateReport model:', error);
    throw error;
  }
};

/**
 * DynamoDB + PostgreSQL データを結合してレポート詳細を取得
 */
export const getReportDetailsWithAllData = async (
  ddbDocClient: DynamoDBDocumentClient,
  report_id: string,
  client_id: string,
): Promise<(Report & { property?: any; client_data?: any }) | null> => {
  try {
    // DynamoDBからレポート詳細を取得
    const reportWithProperty = await getReportDetails(ddbDocClient, report_id, client_id);
    
    if (!reportWithProperty) {
      return null;
    }

    // PostgreSQLからクライアント情報と担当者情報を取得
    const clientData = await getClientDataByClientId(client_id);

    return {
      ...reportWithProperty,
      client_data: clientData,
    };
  } catch (error) {
    console.error('Error in getReportDetailsWithAllData model:', error);
    throw error;
  }
};

