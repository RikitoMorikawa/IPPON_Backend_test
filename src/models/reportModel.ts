import {
  DynamoDBDocumentClient,
  QueryCommand,
  DeleteCommand,
  PutCommand,
  GetCommand,
} from '@aws-sdk/lib-dynamodb';
import { Report } from '@src/types/report';
import config from '@src/config';
import { getClientDataByClientId } from '@src/services/clientDataService';

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

    const reportCommand = new QueryCommand(reportParams);
    const reportResult = await ddbDocClient.send(reportCommand);

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

    const propertyCommand = new QueryCommand(propertyParams);
    const propertyResult = await ddbDocClient.send(propertyCommand);

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

    const command = new QueryCommand(params);
    const result = await ddbDocClient.send(command);

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
    const command = new QueryCommand(params);
    const result = await ddbDocClient.send(command);

    // Query to get total count (ignoring Limit and ExclusiveStartKey)
    const countParams: any = {
      TableName: config.tableNames.report,
      KeyConditionExpression: 'client_id = :client_id',
      FilterExpression: params.FilterExpression,
      ExpressionAttributeValues: params.ExpressionAttributeValues,
      Select: 'COUNT',
    };
    const countCommand = new QueryCommand(countParams);
    const countResult = await ddbDocClient.send(countCommand);
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

    const params = {
      TableName: config.tableNames.report,
      Key: {
        client_id: client_id,
        created_at: report.created_at
      },
    };

    console.log('DynamoDB Delete Params:', JSON.stringify(params, null, 2));

    const command = new DeleteCommand(params);
    await ddbDocClient.send(command);
  } catch (error) {
    console.error('Error in deleteReport model:', error);
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

