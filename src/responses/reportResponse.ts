import { NotFoundError, BadRequestError } from '@src/errors/httpErrors';
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from '@src/responses/constants/reports/reportConstant';
import { ReportListResponse } from '@src/types/report';

// API Response interface
export interface ApiResponse<T> {
  status: number;
  message: string;
  data?: T;
}

export const ReportErrors = {
  propertyNotFound: (details?: any) =>
    new NotFoundError(ERROR_MESSAGES.PROPERTY_NOT_FOUND, details),

  reportNotFound: (details?: any) => new NotFoundError(ERROR_MESSAGES.REPORT_NOT_FOUND, details),

  invalidLimit: (details?: any) => new BadRequestError(ERROR_MESSAGES.INVALID_LIMIT, details),

  invalidPropertyId: (details?: any) =>
    new BadRequestError(ERROR_MESSAGES.INVALID_PROPERTY_ID, details),

  invalidReportId: (details?: any) =>
    new BadRequestError(ERROR_MESSAGES.INVALID_REPORT_ID, details),

  invalidDateRange: (details?: any) =>
    new BadRequestError(ERROR_MESSAGES.INVALID_DATE_RANGE, details),

  invalidToken: (details?: any) => new BadRequestError(ERROR_MESSAGES.INVALID_TOKEN, details),

  invalidStartKey: (details?: any) => new BadRequestError(ERROR_MESSAGES.INVALID_TOKEN, details),
};

export const ReportResponses = {
  reportsFetched: <T>(data?: T): ApiResponse<T> => ({
    status: 200,
    message: SUCCESS_MESSAGES.REPORTS_FETCHED,
    data,
  }),

  reportFetched: <T>(data?: T): ApiResponse<T> => ({
    status: 200,
    message: SUCCESS_MESSAGES.REPORT_FETCHED,
    data,
  }),

  reportCreated: <T>(data?: T): ApiResponse<T> => ({
    status: 201,
    message: SUCCESS_MESSAGES.REPORT_CREATED,
    data,
  }),

  reportUpdated: <T>(data?: T): ApiResponse<T> => ({
    status: 200,
    message: SUCCESS_MESSAGES.REPORT_UPDATED,
    data,
  }),

  reportDeleted: <T>(data?: T): ApiResponse<T> => ({
    status: 200,
    message: SUCCESS_MESSAGES.REPORT_DELETED,
    data,
  }),
};
