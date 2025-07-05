import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { ReportErrors } from '@src/responses/reportResponse';
import * as reportService from '@src/services/reportService';
import { getReportsParamsSchema, getReportsQuerySchema, apiReportListResponseSchema } from '@src/schemas/reportShema';
import { SUCCESS_MESSAGES } from '@src/responses/constants/reports/reportConstant';

export const getReports = async (
  request: FastifyRequest<{
    Params: z.infer<typeof getReportsParamsSchema>;
    Querystring: z.infer<typeof getReportsQuerySchema>;
  }>,
  reply: FastifyReply
): Promise<void> => {
  try {
    const { property_id } = request.params;
    const queryParams = request.query;
    
    // limitパラメータのバリデーション
    const limit = queryParams.limit || 5;
    if (![5, 10, 15, 20].includes(limit)) {
      throw ReportErrors.invalidLimit({ limit });
    }
    
    // call service to get report list
    const reportListResponse = await reportService.getPropertyReports(property_id, queryParams);
    
    // if property not found
    if (!reportListResponse) {
      throw ReportErrors.propertyNotFound({ property_id });
    }
    
    // スキーマ検証をバイパスせずにFastifyの標準的な方法でレスポンスを返す
    reply.code(200).send({
      status: 200,
      message: SUCCESS_MESSAGES.REPORTS_FETCHED,
      data: reportListResponse
    });
  } catch (error) {
    // エラーをスローして上位のエラーハンドラーに処理を委譲
    throw error;
  }
};