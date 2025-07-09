import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { ReportErrors } from '@src/responses/reportResponse';
import * as reportService from '@src/services/reportService';
import * as reportModel from '@src/repositroies/reportModel';
import { Report } from '@src/models/reportType';
import {
  getReportsParamsSchema,
  reportsQuerySchema,
} from '@src/schemas/reportShema';
import { SUCCESS_MESSAGES } from '@src/responses/constants/reports/reportConstant';
import { CustomFastifyInstance } from '@src/interfaces/CustomFastifyInstance';
import { getClientId } from '@src/middleware/userContext';
import { verifyDdbClient } from '@src/services/customerService';
import { errorResponse, successResponse } from '@src/responses';
import { generateReportExcel } from '@src/services/excelService';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { ReportListData, ReportListResponse, ReportDetailData, ReportDetailResponse } from '@src/interfaces/reportInterfaces';
import { ReportStatus, REPORT_STATUSES } from '@src/enums/reportEnums';
import { ScanCommand } from '@aws-sdk/lib-dynamodb';
import config from '@src/config';
import * as batchReportModel from '@src/repositroies/batchReportModel';
import { CreateBatchReportSettingRequest } from '@src/models/batchReportType';
import { getEmployeeId } from '@src/middleware/userContext';


interface FastifyInstanceWithDynamoDB {
  ddbDocClient: DynamoDBDocumentClient;
}

export const getReports = async (
  request: FastifyRequest<{
    Params: z.infer<typeof getReportsParamsSchema>;
    Querystring: z.infer<typeof reportsQuerySchema>;
  }>,
  reply: FastifyReply,
): Promise<void> => {
  try {
    const { property_id } = request.params;
    const queryParams = request.query;
    const app = request.server as CustomFastifyInstance;
    const client_id = getClientId(request);

    // Validate limit parameter (convert string to number)
    const limit = queryParams.limit ? parseInt(queryParams.limit.toString(), 10) : 5;
    if (![5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60].includes(limit)) {
      throw ReportErrors.invalidLimit({ limit });
    }

    // call service to get report list
    const reportListResponse = await reportService.getPropertyReports(
      property_id,
      client_id,
      {
        limit,
        startKey: queryParams.startKey,
      },
      app.ddbDocClient,
    );

    // if property not found
    if (!reportListResponse) {
      throw ReportErrors.propertyNotFound({ property_id });
    }

    // Format reports to match ReportListData interface
    const formattedReports: ReportListData[] = (reportListResponse.reports || []).map((report: any) => ({
      id: report.id || '',
      title: report.title || '',
      created_at: report.created_at || new Date().toISOString(),
      report_start_date: report.report_start_date || '',
      report_end_date: report.report_end_date || '',
      is_draft: report.is_draft || false,
    }));

    const response: ReportListResponse = {
      status: 200,
      message: SUCCESS_MESSAGES.REPORTS_FETCHED,
      data: {
        total: formattedReports.length,
        page: 1,
        limit: limit,
        items: formattedReports
      }
    };
    
    return reply.code(200).type('application/json').send(response);
  } catch (error) {
    console.error('Error in getReports controller:', error);
    if (error instanceof Error) {
      errorResponse(500, error.message, reply);
    } else {
      errorResponse(500, 'An unexpected error occurred', reply);
    }
  }
};

export const getReportDetails = async (
  request: FastifyRequest<{
    Params: {
      report_id: string;
    };
  }>,
  reply: FastifyReply,
): Promise<void> => {
  try {
    const { report_id } = request.params;
    const app = request.server as CustomFastifyInstance;
    const client_id = getClientId(request);

    const report = await reportService.getReportDetailsForAPI(report_id, client_id, app.ddbDocClient);

    const response: ReportDetailResponse = {
      status: 200,
      message: SUCCESS_MESSAGES.REPORT_FETCHED,
      data: report
    };

    reply.code(200).send(response);
  } catch (error) {
    throw error;
  }
};

export const getReportsByClient = async (
  request: FastifyRequest<{
    Querystring: {
      limit?: number;
      startKey?: string;
      period?: string;
      startDate: string;
      endDate: string;
      weekStartDay?:
        | 'sunday'
        | 'monday'
        | 'tuesday'
        | 'wednesday'
        | 'thursday'
        | 'friday'
        | 'saturday';
      page?: number;
    };
  }>,
  reply: FastifyReply,
): Promise<void> => {
  try {
    const queryParams = request.query;
    const app = request.server as CustomFastifyInstance;
    const client_id = getClientId(request);

    const limit = queryParams.limit || 5;
    if (![5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60].includes(limit)) {
      throw ReportErrors.invalidLimit({ limit });
    }

    let startKey;
    if (queryParams.startKey) {
      try {
        startKey = JSON.parse(Buffer.from(queryParams.startKey, 'base64').toString());
      } catch (error) {
        throw ReportErrors.invalidStartKey({ startKey: queryParams.startKey });
      }
    }

    let period;
    if (queryParams.period) {
      const [start_date, end_date] = queryParams.period.split('~').map((date) => date.trim());
      if (!start_date || !end_date) {
        throw ReportErrors.invalidDateRange({ period: queryParams.period });
      }
      period = { start_date, end_date };
    }

    const page = Number(queryParams.page) || 1;

    // Fetch reports
    const { reports, total, lastEvaluatedKey } = await reportService.getReportsByClient(
      app.ddbDocClient,
      client_id,
      limit,
      startKey,
      period,
      queryParams.weekStartDay,
    );

    const formattedReports: ReportListData[] = reports.map(report => ({
      id: report.id || '',
      title: report.title || '',
      created_at: report.created_at || new Date().toISOString(),
      report_start_date: report.report_start_date || '',
      report_end_date: report.report_end_date || '',
      is_draft: report.is_draft || false,
    }));

    const response: ReportListResponse = {
      status: 200,
      message: SUCCESS_MESSAGES.REPORTS_FETCHED,
      data: {
        total: total || 0,
        page: page,
        limit: limit,
        items: formattedReports
      }
    };

    return reply.code(200).send(response);
  } catch (error) {
    throw error;
  }
};


export const deleteReport = async (
  request: FastifyRequest<{
    Params: {
      report_id: string;
    };
  }>,
  reply: FastifyReply,
): Promise<void> => {
  try {
    const { report_id } = request.params;
    const app = request.server as CustomFastifyInstance;
    const client_id = getClientId(request);

    await reportService.deleteReport(report_id, client_id, app.ddbDocClient);

    reply.code(200).send({
      status: 200,
      message: SUCCESS_MESSAGES.REPORT_DELETED,
      data: {
        report_id,
      },
    });
  } catch (error) {
    throw error;
  }
};

export const createReport = async (
  request: FastifyRequest<{
    Body: {
      client_id: string;
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
        summary: string;
      }>;
    };
    Params: {
      property_id: string;
    };
  }>,
  reply: FastifyReply,
) => {
  try {
    const { property_id } = request.params;
    const reportData = request.body;
    const app = request.server as CustomFastifyInstance;
    const client_id = getClientId(request);

    if (reportData.property_id !== property_id) {
      throw ReportErrors.invalidPropertyId({ property_id });
    }

    const ddbDocClient = verifyDdbClient(app);
    const report = await reportService.createReport(reportData, client_id, ddbDocClient);

    // Transform the report data to match the required response format
    const response = {
      report_id: report.id,
      client_id: report.client_id,
      property_id: report.property_id,
      property_name: reportData.property_name,
      current_status: report.current_status || REPORT_STATUSES.RECRUITING,
      summary: report.summary || 'No summary available',
      suumo: report.is_suumo_published || false,
      views_count: report.views_count || 0,
      inquiries_count: report.inquiries_count || 0,
      business_meeting_count: report.business_meeting_count || 0,
      viewing_count: report.viewing_count || 0,
      customer_interactions: report.customer_interactions?.map((interaction: any) => ({
        customer_id: interaction.customer_id,
        customer_name: interaction.customer_name,
        inquired_at: interaction.date,
        category: interaction.category,
        content: interaction.content
      })) || []
    };

    // Send the response with proper status code and message
    return reply.status(201).send({
      status: 201,
      message: 'Successfully created report',
      data: response
    });
  } catch (error) {
    console.error('Error creating report:', error); // Add error logging
    if (error instanceof Error) {
      return reply.status(500).send({
        status: 500,
        message: error.message
      });
    } else {
      return reply.status(500).send({
        status: 500,
        message: 'An unexpected error occurred'
      });
    }
  }
};

export const saveReport = async (request: FastifyRequest, reply: FastifyReply) => {
  const { property_id } = request.params as { property_id: string };
  const client_id = getClientId(request);
  const reportData = request.body as any;

  try {
    // is_newフラグで新規作成・更新を分岐
    if (reportData.is_new) {
      // 新規作成の場合（AI処理なし）
      console.log('Creating new report without AI processing...');
      
      // 物件情報を取得して property_name を設定
      const propertyResult = await (request.server as any).ddbDocClient.send(new ScanCommand({
        TableName: config.tableNames.properties,
        FilterExpression: 'id = :id AND client_id = :client_id',
        ExpressionAttributeValues: {
          ':id': reportData.property_id,
          ':client_id': client_id
        }
      }));

      if (!propertyResult.Items || propertyResult.Items.length === 0) {
        return reply.status(400).send({
          status: 400,
          message: 'Property not found'
        });
      }

      const property = propertyResult.Items[0];
      
      // customer_interactionsから日付範囲を取得
      const dates = reportData.customer_interactions?.map((interaction: any) => interaction.date).filter((date: any) => date) || [];
      const startDate = dates.length > 0 ? dates.reduce((min: string, date: string) => date < min ? date : min) : new Date().toISOString().split('T')[0];
      const endDate = dates.length > 0 ? dates.reduce((max: string, date: string) => date > max ? date : max) : new Date().toISOString().split('T')[0];
      
      // AI処理なしで直接レポートを作成
      const reportId = `RPT-${startDate.replace(/-/g, '')}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`;
      const reportDate = new Date().toISOString().split('T')[0];
      
      const reportToSave: Report = {
        id: reportId,
        client_id,
        property_id: reportData.property_id,
        report_start_date: startDate,
        report_end_date: endDate,
        title: reportData.report_name || `販売状況報告書_${reportDate}`,
        is_draft: reportData.save_type === 'draft',
        report_date: reportData.report_date || reportDate,
        current_status: reportData.current_status || 'recruiting',
        summary: reportData.summary || '',
        price: property.price || '0',
        sales_start_date: property.sales_start_date || property.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
        is_suumo_published: reportData.suumo || false,
        views_count: reportData.views_count || 0,
        inquiries_count: reportData.inquiries_count || 0,
        business_meeting_count: reportData.business_meeting_count || 0,
        viewing_count: reportData.viewing_count || 0,
        customer_interactions: reportData.customer_interactions?.map((interaction: any) => ({
          customer_id: interaction.id || '',
          date: interaction.date || '',
          title: '顧客対応',
          customer_name: interaction.customer_name || '',
          category: interaction.category || '',
          content: interaction.content || ''
        })) || [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // DynamoDBに直接保存
      await reportModel.createReport((request.server as any).ddbDocClient, reportToSave);

      return reply.status(201).send({
        status: 201,
        message: 'Report created successfully',
        data: {
          id: reportId,
          client_id,
          property_id: reportData.property_id,
          property_name: property.name || '',
          title: reportToSave.title,
          current_status: reportToSave.current_status,
          summary: reportToSave.summary,
          is_suumo_published: reportToSave.is_suumo_published,
          views_count: reportToSave.views_count,
          inquiries_count: reportToSave.inquiries_count,
          business_meeting_count: reportToSave.business_meeting_count,
          viewing_count: reportToSave.viewing_count,
          customer_interactions: reportToSave.customer_interactions
        }
      });
    } else {
      
      const report_id = reportData.id;
      if (!report_id) {
        return reply.status(400).send({
          status: 400,
          message: 'Report ID is required for update'
        });
      }

      const result = await reportService.saveReport(reportData, report_id, client_id, (request.server as any).ddbDocClient);

      // If save_type is completed and we have excel_data, send it as a file
      if (reportData.save_type === 'completed' && result.result.excel_data) {
        const excelBuffer = Buffer.from(result.result.excel_data.data);
        reply.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        reply.header('Content-Disposition', `attachment; filename=report-${report_id}.xlsx`);
        return reply.send(excelBuffer);
      }

      // Otherwise send the normal response
      return reply.send({
        status: 200,
        message: 'Report updated successfully',
        data: result
      });
    }
  } catch (error) {
    console.error('Error in saveReport:', error);
    throw error;
  }
};

export const downloadReport = async (request: FastifyRequest, reply: FastifyReply) => {
  const { property_id, report_id } = request.params as { property_id: string; report_id: string };
  const client_id = getClientId(request);

  if (!client_id) {
    return reply.status(400).send({ error: 'Client ID is required' });
  }

  try {
    const excelBuffer = await generateReportExcel(report_id, client_id, (request.server as any).ddbDocClient);

    reply.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    reply.header('Content-Disposition', `attachment; filename=report-${report_id}.xlsx`);

    return reply.send(excelBuffer);
  } catch (error) {
    console.error('Download Report Error:', error);
    throw error;
  }
};

export const setupReportBatch = async (request: FastifyRequest, reply: FastifyReply) => {
  const { property_id } = request.params as { property_id: string };
  const client_id = getClientId(request);
  const employee_id = getEmployeeId(request);
  const batchData = request.body as CreateBatchReportSettingRequest;

  try {
    // property_idをbatchDataに追加
    const fullBatchData = {
      ...batchData,
      property_id: property_id
    };

    // バッチ設定を保存
    const batchSetting = await batchReportModel.createBatchReportSetting(
      (request.server as any).ddbDocClient,
      client_id,
      employee_id,
      fullBatchData
    );

    // 物件名を取得してレスポンスに含める
    const propertyResult = await (request.server as any).ddbDocClient.send(new ScanCommand({
      TableName: config.tableNames.properties,
      FilterExpression: 'id = :id AND client_id = :client_id',
      ExpressionAttributeValues: {
        ':id': property_id,
        ':client_id': client_id
      }
    }));

    const property = propertyResult.Items?.[0];

    return reply.send({
      status: 201,
      message: 'Batch report setting created successfully',
      data: {
        id: batchSetting.id,
        property_id: batchSetting.property_id,
        property_name: property?.name || '',
        start_date: batchSetting.start_date,
        auto_create_period: batchSetting.auto_create_period,
        auto_generate: batchSetting.auto_generate,
        execution_time: batchSetting.execution_time,
        next_execution_date: batchSetting.next_execution_date,
        status: batchSetting.status,
        created_at: batchSetting.created_at
      }
    });
  } catch (error) {
    console.error('Error in setupReportBatch:', error);
    throw error;
  }
};

export const updateReportBatch = async (request: FastifyRequest, reply: FastifyReply) => {
  const { property_id } = request.params as { property_id: string };
  const client_id = getClientId(request);
  const updateData = request.body as Partial<CreateBatchReportSettingRequest>;

  try {
    // 既存のバッチ設定を取得
    const existingBatch = await batchReportModel.getBatchReportSettingByProperty(
      (request.server as any).ddbDocClient,
      client_id,
      property_id
    );

    if (!existingBatch) {
      return reply.status(404).send({
        status: 404,
        message: 'Batch setting not found for this property',
        data: null
      });
    }

    // 更新データを準備
    const updates: any = {};
    
    if (updateData.start_date !== undefined) {
      updates.start_date = updateData.start_date;
    }
    if (updateData.auto_create_period !== undefined) {
      updates.auto_create_period = updateData.auto_create_period;
    }
    if (updateData.auto_generate !== undefined) {
      updates.auto_generate = updateData.auto_generate;
    }
    if (updateData.execution_time !== undefined) {
      updates.execution_time = updateData.execution_time;
    }

    // start_dateまたはexecution_timeが変更された場合、next_execution_dateを再計算
    if (updateData.start_date || updateData.execution_time) {
      const startDate = new Date(updateData.start_date || existingBatch.start_date);
      const executionTime = updateData.execution_time || existingBatch.execution_time;
      const [hours, minutes] = executionTime.split(':').map(Number);
      
      const nextExecutionDate = new Date(startDate);
      nextExecutionDate.setHours(hours, minutes, 0, 0);
      updates.next_execution_date = nextExecutionDate.toISOString();
    }

    // バッチ設定を更新
    const updatedBatch = await batchReportModel.updateBatchReportSetting(
      (request.server as any).ddbDocClient,
      client_id,
      existingBatch.created_at,
      updates
    );

    // 物件名を取得してレスポンスに含める
    const propertyResult = await (request.server as any).ddbDocClient.send(new ScanCommand({
      TableName: config.tableNames.properties,
      FilterExpression: 'id = :id AND client_id = :client_id',
      ExpressionAttributeValues: {
        ':id': property_id,
        ':client_id': client_id
      }
    }));

    const property = propertyResult.Items?.[0];

    return reply.send({
      status: 200,
      message: 'Batch report setting updated successfully',
      data: {
        id: updatedBatch.id,
        property_id: updatedBatch.property_id,
        property_name: property?.name || '',
        start_date: updatedBatch.start_date,
        auto_create_period: updatedBatch.auto_create_period,
        auto_generate: updatedBatch.auto_generate,
        execution_time: updatedBatch.execution_time,
        next_execution_date: updatedBatch.next_execution_date,
        status: updatedBatch.status,
        execution_count: updatedBatch.execution_count,
        last_execution_date: updatedBatch.last_execution_date || null,
        updated_at: updatedBatch.updated_at
      }
    });
  } catch (error) {
    console.error('Error in updateReportBatch:', error);
    return reply.status(500).send({
      status: 500,
      message: 'Failed to update batch setting',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
