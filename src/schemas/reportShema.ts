import { z } from 'zod';

// Schema for customer interaction data
export const customerInteractionSchema = z
  .object({
    customer_id: z.string().optional().describe('Unique identifier of the customer'),
    date: z.string().optional().describe('Date of the interaction in YYYY-MM-DD format'),
    title: z.string().optional().describe('Title of the customer interaction'),
    customer_name: z.string().optional().describe('Name of the customer'),
    category: z.string().optional().describe('Category of the interaction (e.g., 内見, 問合せ)'),
    content: z.string().optional().describe('Details or notes about the interaction'),
  })
  .describe('Customer interaction information');

// Schema for request parameters when getting reports
export const getReportsParamsSchema = z
  .object({
    property_id: z
      .string()
      .min(1, 'Property ID is required')
      .describe('Unique identifier of the property'),
  })
  .describe('Parameters for getting property reports');

// Schema for reports query parameters
export const reportsQuerySchema = z
  .object({
    limit: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : undefined))
      .refine((val) => !val || [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60].includes(val), {
        message: 'Limit must be one of: 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60',
      })
      .describe('Number of items per page'),
    page: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : 1))
      .describe('Page number (for frontend compatibility)'),
    startKey: z.string().optional().describe('Token for pagination'),
    period: z
      .string()
      .optional()
      .refine(
        (val) => {
          if (!val) return true;
          const [start, end] = val.split('~').map((d) => d.trim());
          return (
            start && end && /^\d{4}-\d{2}-\d{2}$/.test(start) && /^\d{4}-\d{2}-\d{2}$/.test(end)
          );
        },
        {
          message: 'Period must be in format YYYY-MM-DD ~ YYYY-MM-DD',
        },
      )
      .describe('Date range in format YYYY-MM-DD ~ YYYY-MM-DD'),
    weekStartDay: z
      .enum(['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'])
      .optional()
      .describe('First day of the week'),
  })
  .describe('Query parameters for getting reports');

// Schema for property information
export const propertySchema = z
  .object({
    id: z.string().describe('Unique identifier of the property'),
    name: z.string().describe('Property name'),
    address: z.string().describe('Property address'),
  })
  .required()
  .describe('Property information');

// Schema for report information
export const reportSchema = z
  .object({
    id: z.string().describe('Unique identifier of the report'),
    client_id: z.string().describe('Unique identifier of the client'),
    property_id: z.string().describe('Unique identifier of the property'),
    report_start_date: z.string().describe('Start date of the report period'),
    report_end_date: z.string().describe('End date of the report period'),
    title: z.string().nullable().optional().describe('Title of the report'),
    is_draft: z.boolean().optional().describe('Whether the report is a draft'),
    report_date: z.string().nullable().optional().describe('Date when the report was created'),
    current_status: z.string().nullable().optional().describe('Current status of the report'),
    summary: z.string().nullable().optional().describe('Summary of the report'),
    price: z.string().describe('Initial listing price from property table'),
    sales_start_date: z.string().describe('Sales start date from property table'),
    is_suumo_published: z.boolean().optional().describe('Whether the report is published on SUUMO'),
    views_count: z.number().optional().describe('Number of views (manual input)'),
    inquiries_count: z.number().optional().describe('Number of inquiries (manual input)'),
    business_meeting_count: z.number().optional().describe('Number of business meetings'),
    viewing_count: z.number().optional().describe('Number of viewings'),
    suumo_views_api: z.number().optional().describe('Number of views from SUUMO API'),
    suumo_inquiries_api: z.number().optional().describe('Number of inquiries from SUUMO API'),
    portal_data: z.record(z.any()).optional().describe('Portal-specific data (Map type)'),
    customer_interactions: z
      .array(customerInteractionSchema)
      .optional()
      .describe('List of customer interactions'),
    created_at: z.string().describe('Timestamp when the report was created'),
    updated_at: z.string().nullable().optional().describe('Timestamp when the report was last updated'),
    deleted_at: z.string().nullable().optional().describe('Timestamp when the report was deleted'),
  })
  .required()
  .describe('Report information');

// Schema for pagination information
export const paginationSchema = z
  .object({
    next_token: z.string().describe('Token for the next page of results'),
    prev_token: z.string().describe('Token for the previous page of results'),
    limit: z.number().int().min(5).max(60).describe('Number of items per page'),
  })
  .required()
  .describe('Pagination information');

export const reportListResponseSchema = z
  .object({
    reports: z.array(reportSchema).describe('List of reports'),
    pagination: paginationSchema.describe('Pagination information'),
  })
  .describe('Report list response');

// Frontend compatible response schema
export const frontendReportListResponseSchema = z
  .object({
    total: z.number().describe('Total number of reports'),
    page: z.number().describe('Current page number'),
    limit: z.number().describe('Number of items per page'),
    items: z.array(reportSchema).describe('List of reports'),
  })
  .describe('Frontend report list response');

export const apiReportListResponseSchema = z
  .object({
    status: z.number().describe('HTTP status code'),
    message: z.string().describe('Response message'),
    data: reportListResponseSchema,
  })
  .required()
  .describe('API response');

export const getReportDetailsParamsSchema = z
  .object({
    report_id: z
      .string()
      .min(1, 'Report ID is required')
      .describe('Unique identifier of the report'),
  })
  .describe('Parameters for getting report details');

export const apiReportDetailsResponseSchema = z
  .object({
    status: z.number().describe('HTTP status code'),
    message: z.string().describe('Response message'),
    data: reportSchema,
  })
  .required()
  .describe('API response for report details');

export const createReportBodySchema = z.object({
  client_id: z.string().describe('Client ID / クライアントID'),
  property_id: z.string().describe('Property ID / 物件ID'),
  property_name: z.string().describe('Property Name / 物件名'),
  report_start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format').describe('Report Start Date / 報告開始日 (YYYY-MM-DD)'),
  report_end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format').describe('Report End Date / 報告終了日 (YYYY-MM-DD)'),
  customer_interactions: z.array(z.object({
    customer_id: z.string().describe('Customer ID / 顧客ID'),
    customer_name: z.string().describe('Customer Name / 顧客名'),
    inquired_at: z.string().describe('DATETIME (YYYY-MM-DD hh:mm:ss) / 問い合わせ日時'),
    category: z.string().optional().describe('Category / 問い合わせカテゴリ'),
    type: z.string().optional().describe('Type / 問い合わせ種別'),
    summary: z.string().describe('Summary(Inquiry details before AI summary) / 問い合わせ内容(AI要約前の問い合わせ内容)')
  })).optional().describe('Customer Interactions / 顧客対応内容')
}).required();

export const createReportResponseSchema = z.object({
  report_id: z.string().describe('Report ID / 報告書ID'),
  client_id: z.string().describe('Client ID / クライアントID'),
  property_id: z.string().describe('Property ID / 物件ID'),
  property_name: z.string().describe('Property Name / 物件名'),
  current_status: z.string().describe('Current Status / 現在状況'),
  summary: z.string().describe('AI Summary / 全体要約(AI)'),
  suumo: z.boolean().optional().describe('Whether listed on Suumo / Suumo掲載有無'),
  views_count: z.number().optional().describe('Views (manual input) / 閲覧数（手入力）'),
  inquiries_count: z.number().optional().describe('Inquiries (manual input) / お問い合わせ数（手入力）'),
  business_meeting_count: z.number().optional().describe('Business meeting count / 期間内の商談実施人数'),
  viewing_count: z.number().optional().describe('Previews / 期間内の内見人数'),
  customer_interactions: z.array(z.object({
    customer_id: z.string().describe('Customer ID / 顧客ID'),
    customer_name: z.string().describe('Customer Name / 顧客名'),
    inquired_at: z.string().describe('DATETIME (YYYY-MM-DD hh:mm:ss) / 問い合わせ日時'),
    category: z.string().optional().describe('Category / カテゴリ'),
    content: z.string().describe('AI Content / AIで要約した内容')
  })).optional().describe('Customer Interactions / 顧客対応内容')
}).required();

export const apiCreateReportResponseSchema = z.object({
  status: z.number().describe('HTTP status code'),
  message: z.string().describe('Response message'),
  data: createReportResponseSchema
}).required();

// Schema for delete report response
export const apiDeleteReportResponseSchema = z
  .object({
    status: z.number().describe('HTTP status code'),
    message: z.string().describe('Response message'),
    data: z.object({
      report_id: z.string().describe('ID of the deleted report'),
    }),
  })
  .required()
  .describe('API response for deleting a report');

export const saveReportBodySchema = z.object({
  property_id: z.string().describe('Property ID / 物件ID'),
  title: z.string().optional().describe('Report Title / 報告書タイトル'),
  report_name: z.string().optional().describe('Report Name / 報告書名'),
  report_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format').describe('Report Date (YYYY-MM-DD) / 報告日 (YYYY-MM-DD)'),
  current_status: z.string().optional().describe('Current Status / 現在状況'),
  views_count: z.number().optional().describe('Views (manual input) / 閲覧数（手入力）'),
  inquiries_count: z.number().optional().describe('Inquiries (manual input) / 問い合わせ数（手入力）'),
  business_meeting_count: z.number().optional().describe('Business meeting count / 期間内の商談実施人数'),
  viewing_count: z.number().optional().describe('Previews / 期間内の内見人数'),
  is_suumo_published: z.boolean().optional().describe('Whether listed on Suumo / Suumo掲載有無'),
  suumo: z.boolean().optional().describe('SUUMO flag (alias for is_suumo_published) / SUUMOフラグ'),
  suumo_views_api: z.number().optional().describe('SUUMO Views from API / SUUMO閲覧数（API取得）'),
  suumo_inquiries_api: z.number().optional().describe('SUUMO Inquiries from API / SUUMO問い合わせ数（API取得）'),
  customer_interactions: z.array(customerInteractionSchema).optional().describe('Customer Interactions / 顧客対応内容'),
  save_type: z.enum(['draft', 'completed']).describe('Draft or Completed (Excel output) / 下書き保存 or 完了（Excel出力）'),
  
  // Additional fields that might come from frontend
  id: z.string().optional().describe('Report ID'),
  report_route_name: z.string().optional().describe('Report route name'),
  summary: z.string().optional().describe('Report summary'),
  publish_status: z.string().optional().describe('Publish status'),
  homes: z.boolean().optional().describe('Homes flag'),
  at_home: z.boolean().optional().describe('At Home flag'),
});

export const saveReportResponseSchema = z.object({
  client_id: z.string().describe('Client ID / クライアントID'),
  report_id: z.string().describe('Report ID / 報告書ID'),
  property_id: z.string().describe('Property ID / 物件ID'),
  property_name: z.string().describe('Property Name / 物件名'),
  title: z.string().describe('Report Title / 報告書タイトル'),
  report_date: z.string().describe('Report Date / 報告日'),
  current_status: z.string().describe('Current Status / 現在状況'),
  views_count: z.number().optional().describe('Views (manual input) / 閲覧数（手入力）'),
  inquiries_count: z.number().optional().describe('Inquiries (manual input) / 問い合わせ数（手入力）'),
  business_meeting_count: z.number().optional().describe('Business meeting count / 期間内の商談実施人数'),
  viewing_count: z.number().optional().describe('Previews / 期間内の内見人数'),
  is_suumo_published: z.boolean().optional().describe('Whether listed on Suumo / Suumo掲載有無'),
  suumo_views_api: z.number().optional().describe('SUUMO Views from API / SUUMO閲覧数（API取得）'),
  suumo_inquiries_api: z.number().optional().describe('SUUMO Inquiries from API / SUUMO問い合わせ数（API取得）'),
  result: z.object({
    success: z.boolean().describe('Save Success Flag / 保存成功フラグ'),
    message: z.string().describe('Result Message / 結果メッセージ'),
    excel_data: z.string().optional().describe('Base64 encoded Excel data (only when completed) / Base64エンコードされたExcelデータ（完了時のみ）')
  }),
  created_at: z.string().describe('Creation Date Time (ISO8601 Format) / 作成日時 (ISO8601形式)'),
  updated_at: z.string().describe('Update Date Time (ISO8601 Format) / 更新日時 (ISO8601形式)')
}).required();

export const apiSaveReportResponseSchema = z.object({
  status: z.number().describe('HTTP status code'),
  message: z.string().describe('Response message'),
  data: saveReportResponseSchema
}).required();
