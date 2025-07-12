import { Report } from '@src/models/report';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import * as reportModel from '@src/repositroies/reportModel';
import { ReportErrors } from '@src/responses/reportResponse';
import { v4 as uuidv4 } from 'uuid';
import { PrismaClient } from '@prisma/client';
import { ScanCommand } from '@aws-sdk/lib-dynamodb';
import config from '@src/config';
import { generateReportExcel } from './excelService';
import axios from 'axios';
import { REPORT_STATUSES } from '@src/enums/reportEnums';
import { INQUIRY_CATEGORIES } from '@src/enums/inquiryEnums';
import { scanWithoutDeleted } from '@src/utils/softDelete';

const prisma = new PrismaClient();

interface SummarizedInteraction {
  customer_id: string;
  customer_name: string;
  date: string;
  category: string | null;
  content: string;
}

export const getPropertyReports = async (
  property_id: string,
  client_id: string,
  queryParams: {
    limit?: number;
    startKey?: string;
  },
  ddbDocClient: DynamoDBDocumentClient,
) => {
  try {
    let startKey;
    if (queryParams.startKey) {
      try {
        startKey = JSON.parse(Buffer.from(queryParams.startKey, 'base64').toString());
      } catch (error) {
        throw ReportErrors.invalidStartKey({ startKey: queryParams.startKey });
      }
    }

    const { reports, lastEvaluatedKey } = await reportModel.getPropertyReports(
      ddbDocClient,
      property_id,
      client_id,
      queryParams.limit || 5,
      startKey,
    );

    const nextToken = lastEvaluatedKey
      ? Buffer.from(JSON.stringify(lastEvaluatedKey)).toString('base64')
      : '';

    return {
      reports,
      pagination: {
        next_token: nextToken,
        prev_token: '',
        limit: queryParams.limit || 5,
      },
    };
  } catch (error) {
    throw error;
  }
};

export const getReportDetails = async (
  report_id: string,
  client_id: string,
  ddbDocClient: DynamoDBDocumentClient,
) => {
  try {
    const report = await reportModel.getReportDetails(ddbDocClient, report_id, client_id);
    if (!report) {
      throw ReportErrors.reportNotFound({ report_id });
    }
    return report;
  } catch (error) {
    throw error;
  }
};

export const getReportDetailsForAPI = async (
  report_id: string,
  client_id: string,
  ddbDocClient: DynamoDBDocumentClient,
) => {
  try {
    const report = await reportModel.getReportDetailsForAPI(ddbDocClient, report_id, client_id);
    if (!report) {
      throw ReportErrors.reportNotFound({ report_id });
    }
    return report;
  } catch (error) {
    throw error;
  }
};

/**
 * PostgreSQL + DynamoDB結合データでレポート詳細を取得
 */
export const getReportDetailsWithAllData = async (
  report_id: string,
  client_id: string,
  ddbDocClient: DynamoDBDocumentClient,
) => {
  try {
    const report = await reportModel.getReportDetailsWithAllData(ddbDocClient, report_id, client_id);
    if (!report) {
      throw ReportErrors.reportNotFound({ report_id });
    }
    return report;
  } catch (error) {
    throw error;
  }
};

export const getReportsByClient = async (
  ddbDocClient: DynamoDBDocumentClient,
  client_id: string,
  limit: number,
  startKey?: any,
  period?: {
    start_date: string;
    end_date: string;
  },
  weekStartDay?: 'sunday' | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday',
) => {
  try {
    return await reportModel.getReportsByClientId(
      ddbDocClient,
      client_id,
      limit,
      startKey,
      period,
      weekStartDay,
    );
  } catch (error) {
    throw error;
  }
};

export const deleteReport = async (
  report_id: string,
  client_id: string,
  ddbDocClient: DynamoDBDocumentClient,
): Promise<void> => {
  try {
    const report = await reportModel.getReportDetails(ddbDocClient, report_id, client_id);

    if (!report) {
      throw ReportErrors.reportNotFound({ report_id });
    }

    await reportModel.deleteReport(ddbDocClient, report_id, client_id);
  } catch (error) {
    throw error;
  }
};

/**
 * 複数レポートを削除
 */
export const deleteMultipleReports = async (
  report_ids: string[],
  client_id: string,
  ddbDocClient: DynamoDBDocumentClient,
): Promise<{
  deleted_count: number;
  not_found_ids: string[];
  errors: string[];
}> => {
  try {
    if (!Array.isArray(report_ids) || report_ids.length === 0) {
      throw new Error('レポートIDの配列が必要です');
    }

    const result = await reportModel.deleteMultipleReports(
      ddbDocClient,
      report_ids,
      client_id
    );

    return result;
  } catch (error) {
    console.error('Error in deleteMultipleReports service:', error);
    throw error;
  }
};

export const createReport = async (
  reportData: {
    property_id: string;
    property_name: string;
    report_start_date: string;
    report_end_date: string;
    customer_interactions?: Array<{
      customer_id: string;
      customer_name: string;
      inquired_at: string;
      category?: string;
      type?: string;
      title?: string;
      summary: string;
    }>;
  },
  client_id: string,
  ddbDocClient: DynamoDBDocumentClient,
) => {
  try {
    // STEP 1: Get property details from DynamoDB
    const propertyResult = await scanWithoutDeleted(ddbDocClient, {
      TableName: config.tableNames.properties,
      FilterExpression: 'id = :id AND client_id = :client_id',
      ExpressionAttributeValues: {
        ':id': reportData.property_id,
        ':client_id': client_id
      }
    });


    if (!propertyResult.Items || propertyResult.Items.length === 0) {
      throw ReportErrors.propertyNotFound({ property_id: reportData.property_id });
    }

    const property = propertyResult.Items[0];


    // STEP 2: Summarize each inquiry using Meeting Report API
    let summarizeResponse;
    const requestData = {
      inquiry_infos: reportData.customer_interactions?.map((interaction, index, array) => {
        // Check if this is a new inquiry based on the title
        const isFirstInteraction = interaction.category === INQUIRY_CATEGORIES.NEW_INQUIRY;

        return {
          inquiry_id: `INQ-${interaction.inquired_at.split(' ')[0].replace(/-/g, '')}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
          customer_id: interaction.customer_id,
          customer_name: interaction.customer_name,
          property_name: reportData.property_name,
          inquiry_type: interaction.type || '',
          inquiry_title: interaction.title || 'お問い合わせ',
          summary: interaction.summary,
          date: interaction.inquired_at.split(' ')[0],
          first_interaction_flag: isFirstInteraction
        };
      })
    };

    console.log('Meeting Report API Request:', JSON.stringify(requestData, null, 2));

    try {
      summarizeResponse = await axios.post('https://summary-ai.ippon-cloud.com/api/v1/meeting-report', requestData);
    } catch (error: any) {
      console.error('Meeting Report API Error:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        request: {
          url: 'https://summary-ai.ippon-cloud.com/api/v1/meeting-report',
          data: requestData
        }
      });
      throw new Error(`Meeting Report API error (${error.response?.status}): ${JSON.stringify(error.response?.data)}`);
    }

    console.log("hello", summarizeResponse.data.data.inquiry_infos);

    console.log("summarizeResponse", JSON.stringify(summarizeResponse.data));

    const summarizedInteractions = summarizeResponse.data.data.inquiry_infos;



    // STEP 3: Generate full report using Summary Report API
    const summaryResponse = await axios.post('https://summary-ai.ippon-cloud.com/api/v1/summary-report', {
      property_id: reportData.property_id,
      property_name: reportData.property_name,
      views_count: 0,
      inquiries_count: reportData.customer_interactions?.length || 0,
      business_meeting_count: 0,
      viewing_count: 0,
      report_start_date: reportData.report_start_date,
      report_end_date: reportData.report_end_date,
      customer_interactions: reportData.customer_interactions?.map(interaction => ({
        customer_id: interaction.customer_id,
        customer_name: interaction.customer_name,
        inquired_at: interaction.inquired_at,
        category: interaction.type || 'inquiry',
        summary: interaction.summary
      }))
    });

    // Add error handling with detailed logging
    if (summaryResponse.status !== 200) {
      console.error('Summary Report API Error:', {
        status: summaryResponse.status,
        data: summaryResponse.data,
        request: {
          url: 'https://summary-ai.ippon-cloud.com/api/v1/summary-report',
          data: reportData
        }
      });
      throw new Error(`Summary Report API error: ${JSON.stringify(summaryResponse.data)}`);
    }

    console.log("summaryReport", summaryResponse.data);
    const summaryReport = summaryResponse.data.data.summary_report;

    // STEP 4: Create the report in DynamoDB
    const id = `RPT-${reportData.report_start_date.replace(/-/g, '')}-${uuidv4().slice(0, 3).toUpperCase()}`;

    // Generate title with date format
    const reportDate = new Date().toISOString().split('T')[0];
    const formattedTitle = `販売状況報告書_${reportDate}`;

    const report: Report = {
      id,
      client_id,
      property_id: reportData.property_id,
      report_start_date: reportData.report_start_date,
      report_end_date: reportData.report_end_date,
      title: formattedTitle,
      is_draft: true,
      report_date: reportDate,
      current_status: REPORT_STATUSES.RECRUITING,
      summary: summaryReport,
      // 物件テーブルから必須フィールドを取得
      price: property.price || '0',
      sales_start_date: property.sales_start_date || property.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
      is_suumo_published: property.is_suumo_published || false,
      views_count: property.views_count || 0,
      inquiries_count: property.inquiries_count || 0,
      business_meeting_count: property.business_meeting_count || 0,
      viewing_count: property.viewing_count || 0,
      customer_interactions: summarizedInteractions.map((interaction: SummarizedInteraction) => ({
        customer_id: interaction.customer_id,
        date: interaction.date,
        title: '顧客対応',
        customer_name: interaction.customer_name,
        category: interaction.category || undefined,
        content: interaction.content
      })),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    await reportModel.createReport(ddbDocClient, report);

    // STEP 5: Format the response according to CreateReportResponse interface
    return {
      id,
      client_id,
      property_id: reportData.property_id,
      property_name: reportData.property_name,
      current_status: REPORT_STATUSES.RECRUITING,
      summary: summaryReport,
      is_suumo_published: property.is_suumo_published || false,
      views_count: property.views_count || 0,
      inquiries_count: property.inquiries_count || 0,
      business_meeting_count: property.business_meeting_count || 0,
      viewing_count: property.viewing_count || 0,
      customer_interactions: summarizedInteractions.map((interaction: SummarizedInteraction) => ({
        customer_id: interaction.customer_id,
        customer_name: interaction.customer_name,
        inquired_at: interaction.date,
        category: interaction.category,
        content: interaction.content
      }))
    };
  } catch (error) {
    throw error;
  }
};

export const saveReport = async (
  reportData: {
    property_id: string;
    title?: string;
    report_name?: string;
    report_date: string;
    current_status?: string;
    views_count?: number;
    inquiries_count?: number;
    business_meeting_count?: number;
    viewing_count?: number;
    is_suumo_published?: boolean;
    suumo?: boolean;
    suumo_views_api?: number;
    suumo_inquiries_api?: number;
    customer_interactions?: Array<{
      customer_id?: string;
      customer_name?: string;
      date?: string;
      title?: string;
      category?: string;
      content?: string;
    }>;
    save_type: 'draft' | 'completed';
    // Additional frontend fields
    id?: string;
    report_route_name?: string;
    summary?: string;
    publish_status?: string;
    homes?: boolean;
    at_home?: boolean;
  },
  report_id: string,
  client_id: string,
  ddbDocClient: DynamoDBDocumentClient,
) => {
  try {
    // Map frontend fields to expected fields
    const mappedData = {
      property_id: reportData.property_id,
      title: reportData.title || reportData.report_name || '',
      report_date: reportData.report_date,
      current_status: reportData.current_status,
      views_count: reportData.views_count,
      inquiries_count: reportData.inquiries_count,
      business_meeting_count: reportData.business_meeting_count,
      viewing_count: reportData.viewing_count,
      is_suumo_published: reportData.is_suumo_published ?? reportData.suumo ?? false,
      suumo_views_api: reportData.suumo_views_api ?? 0,
      suumo_inquiries_api: reportData.suumo_inquiries_api ?? 0,
      customer_interactions: reportData.customer_interactions,
      save_type: reportData.save_type,
      summary: reportData.summary,
    };

    console.log('Mapped data:', mappedData);

    // Get existing report
    const existingReport = await reportModel.getReportDetails(ddbDocClient, report_id, client_id);
    if (!existingReport) {
      throw ReportErrors.reportNotFound({ report_id });
    }

    // Get property details
    const propertyResult = await scanWithoutDeleted(ddbDocClient, {
      TableName: config.tableNames.properties,
      FilterExpression: 'id = :id AND client_id = :client_id',
      ExpressionAttributeValues: {
        ':id': reportData.property_id,
        ':client_id': client_id
      }
    });

    if (!propertyResult.Items || propertyResult.Items.length === 0) {
      throw ReportErrors.propertyNotFound({ property_id: reportData.property_id });
    }

    const property = propertyResult.Items[0];

    // Update report
    const updatedReport: Report = {
      ...existingReport,
      title: mappedData.title,
      report_date: mappedData.report_date,
      current_status: mappedData.current_status,
      views_count: mappedData.views_count,
      inquiries_count: mappedData.inquiries_count,
      business_meeting_count: mappedData.business_meeting_count,
      viewing_count: mappedData.viewing_count,
      is_suumo_published: mappedData.is_suumo_published,
      suumo_views_api: mappedData.suumo_views_api,
      suumo_inquiries_api: mappedData.suumo_inquiries_api,
      summary: mappedData.summary || existingReport.summary,
      customer_interactions: mappedData.customer_interactions?.map(interaction => ({
        customer_id: interaction.customer_id,
        customer_name: interaction.customer_name,
        date: interaction.date,
        title: interaction.title,
        category: interaction.category,
        content: interaction.content
      })) || existingReport.customer_interactions,
      is_draft: mappedData.save_type === 'draft',
      updated_at: new Date().toISOString()
    };

    console.log('Updating report with data:', JSON.stringify(updatedReport, null, 2));

    await reportModel.updateReport(ddbDocClient, updatedReport);

    // Generate Excel if save_type is 'completed'
    let excelBuffer;
    if (mappedData.save_type === 'completed') {
      excelBuffer = await generateReportExcel(report_id, client_id, ddbDocClient);
    }

    return {
      client_id,
      report_id,
      property_id: mappedData.property_id,
      property_name: property.name,
      title: mappedData.title,
      report_date: mappedData.report_date,
      current_status: mappedData.current_status || '',
      views_count: mappedData.views_count,
      inquiries_count: mappedData.inquiries_count,
      business_meeting_count: mappedData.business_meeting_count,
      viewing_count: mappedData.viewing_count,
      is_suumo_published: mappedData.is_suumo_published,
      suumo_views_api: mappedData.suumo_views_api,
      suumo_inquiries_api: mappedData.suumo_inquiries_api,
      result: {
        success: true,
        message: mappedData.save_type === 'draft' ? 'Report saved as draft' : 'Report completed and saved',
        excel_data: excelBuffer ? {
          type: 'Buffer',
          data: Array.from(excelBuffer)
        } : undefined
      },
      created_at: existingReport.created_at,
      updated_at: updatedReport.updated_at
    };
  } catch (error) {
    console.error('Error in saveReport:', error);
    throw error;
  }
};

export const getInquiriesForPeriod = async (
  ddbDocClient: DynamoDBDocumentClient,
  client_id: string,
  property_id: string,
  start_date: string,
  end_date: string,
) => {
  try {
    // 顧客情報を取得
    const customerResult = await scanWithoutDeleted(ddbDocClient, {
      TableName: config.tableNames.customers,
      FilterExpression: 'client_id = :client_id',
      ExpressionAttributeValues: {
        ':client_id': client_id
      }
    });
    const customers = customerResult.Items || [];

    // 期間内の問い合わせを検索
    const inquiryResult = await scanWithoutDeleted(ddbDocClient, {
      TableName: config.tableNames.inquiry,
      FilterExpression: 'client_id = :client_id AND property_id = :property_id AND inquired_at BETWEEN :start_date AND :end_date',
      ExpressionAttributeValues: {
        ':client_id': client_id,
        ':property_id': property_id,
        ':start_date': start_date,
        ':end_date': end_date
      }
    });

    const inquiries = (inquiryResult.Items || []).map(inquiry => {
      const customer = customers.find(c => c.id === inquiry.customer_id);
      return {
        ...inquiry,
        customer
      };
    });

    return {
      inquiries,
      total: inquiries.length
    };
  } catch (error) {
    console.error('Error in getInquiriesForPeriod:', error);
    throw error;
  }
};



