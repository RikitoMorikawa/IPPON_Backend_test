import { z } from 'zod';

// Request parameters schema
export const getReportsParamsSchema = z.object({
  property_id: z.string().min(1, 'Property ID is required')
    .describe('Unique identifier of the property')
});

// Query parameters schema
export const getReportsQuerySchema = z.object({
  limit: z.coerce.number().optional().default(5)
    .refine(val => [5, 10, 15, 20].includes(val), {
      message: 'Items per page must be one of: 5, 10, 15, 20'
    })
    .describe('Number of items per page (must be one of: 5, 10, 15, 20)'),
  next_token: z.string().optional()
    .describe('Token for the next page of results'),
  prev_token: z.string().optional()
    .describe('Token for the previous page of results')
}).describe('Pagination query parameters');

// Property information schema
export const propertySchema = z.object({
  id: z.string().describe('Unique identifier of the property'),
  name: z.string().describe('Property name'),
  address: z.string().describe('Property address')
}).required().describe('Property information');

// Report schema
export const reportSchema = z.object({
  id: z.string().describe('Unique identifier of the report'),
  report_name: z.string().describe('Report name'),
  created_at: z.string().datetime().describe('Report creation timestamp'),
  period: z.object({
    start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe('Period start date (YYYY-MM-DD format)'),
    end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe('Period end date (YYYY-MM-DD format)')
  }).required().describe('Report period'),
  status: z.enum(['completed', 'draft']).describe('Report status (completed: finished, draft: in progress)')
}).required().describe('Report information');

// Pagination information schema
export const paginationSchema = z.object({
  next_token: z.string().describe('Token for the next page of results'),
  prev_token: z.string().describe('Token for the previous page of results'),
  limit: z.number().int().min(5).max(20).describe('Number of items per page')
}).required().describe('Pagination information');

// Report list response schema
export const reportListResponseSchema = z.object({
  property: propertySchema,
  reports: z.array(reportSchema),
  pagination: paginationSchema
}).required().describe('Report list response');

// API success response schema
export const apiReportListResponseSchema = z.object({
  status: z.number().describe('HTTP status code'),
  message: z.string().describe('Response message'),
  data: reportListResponseSchema
}).required().describe('API response');
