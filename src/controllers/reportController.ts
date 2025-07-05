import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { ReportErrors } from '@src/responses/reportResponse';
import * as reportService from '@src/services/reportService';
import {
  getReportsParamsSchema,
  reportsQuerySchema,
  createReportBodySchema,
  saveReportBodySchema,
} from '@src/schemas/reportShema';
import { SUCCESS_MESSAGES } from '@src/responses/constants/reports/reportConstant';
import { CustomFastifyInstance } from '@src/interfaces/CustomFastifyInstance';
import { getClientId } from '@src/middleware/userContext';
import { verifyDdbClient } from '@src/services/customerService';
import { errorResponse, successResponse } from '@src/responses';
import { generateReportExcel } from '@src/services/excelService';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';


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

    console.log('getReports called with:', {
      property_id,
      client_id,
      queryParams
    });

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

    console.log('getPropertyReports response:', reportListResponse);

    // if property not found
    if (!reportListResponse) {
      throw ReportErrors.propertyNotFound({ property_id });
    }

    // 一時的にスキーマバリデーションをバイパス
    const response = {
      status: 200,
      message: SUCCESS_MESSAGES.REPORTS_FETCHED,
      data: reportListResponse,
    };
    
    console.log('Sending response:', JSON.stringify(response, null, 2));
    
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

    const report = await reportService.getReportDetails(report_id, client_id, app.ddbDocClient);



    // Format report to match the schema exactly
    const formattedReport = {
      id: report.id || '',
      client_id: report.client_id || '',
      property_id: report.property_id || '',
      report_start_date: report.report_start_date || '',
      report_end_date: report.report_end_date || '',
      title: report.title || null,
      is_draft: report.is_draft || false,
      report_date: report.report_date || null,
      current_status: report.current_status || null,
      summary: report.summary || null,
      price: report.price || '0',
      sales_start_date: report.sales_start_date || '',
      is_suumo_published: report.is_suumo_published || false,
      views_count: report.views_count || 0,
      inquiries_count: report.inquiries_count || 0,
      business_meeting_count: report.business_meeting_count || 0,
      viewing_count: report.viewing_count || 0,
      suumo_views_api: report.suumo_views_api || 0,
      suumo_inquiries_api: report.suumo_inquiries_api || 0,
      portal_data: report.portal_data || {},
      customer_interactions: (report.customer_interactions || []).map(interaction => ({
        customer_id: interaction.customer_id || undefined,
        customer_name: interaction.customer_name || undefined,
        date: interaction.date || undefined,
        title: interaction.title || undefined,
        category: interaction.category || undefined,
        content: interaction.content || undefined
      })),
      created_at: report.created_at || new Date().toISOString(),
      updated_at: report.updated_at || null,
      deleted_at: report.deleted_at || null
    };

    reply.code(200).send({
      status: 200,
      message: SUCCESS_MESSAGES.REPORT_FETCHED,
      data: formattedReport
    });
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

    const formattedReports = reports.map(report => ({
      id: report.id || '',
      client_id: report.client_id || '',
      property_id: report.property_id || '',
      report_start_date: report.report_start_date || '',
      report_end_date: report.report_end_date || '',
      title: report.title || null,
      is_draft: report.is_draft || false,
      report_date: report.report_date || null,
      current_status: report.current_status || null,
      summary: report.summary || null,
      price: report.price || '0',
      sales_start_date: report.sales_start_date || '',
      is_suumo_published: report.is_suumo_published || false,
      views_count: report.views_count || 0,
      inquiries_count: report.inquiries_count || 0,
      business_meeting_count: report.business_meeting_count || 0,
      viewing_count: report.viewing_count || 0,
      suumo_views_api: report.suumo_views_api || 0,
      suumo_inquiries_api: report.suumo_inquiries_api || 0,
      portal_data: report.portal_data || {},
      customer_interactions: (report.customer_interactions || []).map(interaction => ({
        customer_id: interaction.customer_id || undefined,
        customer_name: interaction.customer_name || undefined,
        date: interaction.date || undefined,
        title: interaction.title || undefined,
        category: interaction.category || undefined,
        content: interaction.content || undefined
      })),
      created_at: report.created_at || new Date().toISOString(),
      updated_at: report.updated_at || null,
      deleted_at: report.deleted_at || null
    }));

    const response = {
      total: total || 0,
      page: page,
      limit: limit,
      items: formattedReports
    };

    return reply.code(200).send({
      status: 200,
      message: SUCCESS_MESSAGES.REPORTS_FETCHED,
      data: response
    });
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
      current_status: report.current_status || 'draft',
      summary: report.summary || 'No summary available',
      suumo: report.is_suumo_published || false,
      views_count: report.views_count || 0,
      inquiries_count: report.inquiries_count || 0,
      business_meeting_count: report.business_meeting_count || 0,
      viewing_count: report.viewing_count || 0,
      customer_interactions: report.customer_interactions?.map((interaction: any) => ({
        customer_id: interaction.customer_id,
        customer_name: interaction.customer_name,
        inquired_at: interaction.inquired_at || '',
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
  const { property_id, report_id } = request.params as { property_id: string; report_id: string };
  const client_id = getClientId(request);
  const reportData = request.body as any;

  try {
    console.log('SaveReport Debug:', {
      property_id,
      report_id,
      client_id,
      reportData
    });

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
      message: 'Report saved successfully',
      data: result
    });
  } catch (error) {
    throw error;
  }
};

export const downloadReport = async (request: FastifyRequest, reply: FastifyReply) => {
  const { property_id, report_id } = request.params as { property_id: string; report_id: string };
  const client_id = getClientId(request);

  console.log('Download Report Debug:', {
    property_id,
    report_id,
    client_id
  });

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
