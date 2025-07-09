import { PaginatedListResponse, SuccessResponse } from './responseInterfaces';
import { CustomerInteraction } from '@src/models/reportType';
import { ReportStatus } from '@src/enums/reportEnums';

export interface Report {
  id: string;
  client_id: string;
  property_id: string;
  report_start_date: string;
  report_end_date: string;
  title?: string;
  is_draft?: boolean;
  report_date?: string;
  current_status?: string;
  summary?: string;
  price: string;
  sales_start_date: string;
  is_suumo_published?: boolean;
  views_count?: number;
  inquiries_count?: number;
  business_meeting_count?: number;
  viewing_count?: number;
  suumo_views_api?: number;
  suumo_inquiries_api?: number;
  portal_data?: Record<string, any>;
  customer_interactions?: CustomerInteraction[];
  created_at: string;
  updated_at?: string;
  deleted_at?: string;
}

export interface ExcelFormattedReport {
  reportId: string;
  reportDate: string;
  propertyName: string;
  reportTitle: string;
  clientName: string;
  companyName: string;
  agentName: string;
  activityPeriod: {
    start: string;
    end: string;
  };
  overallReport: string;
  statistics: {
    totalOverview: string;
    isSuumoPublished: boolean;
    views: number;
    inquiries: number;
    businessMeetingCount: number;
    viewingCount: number;
  };
  customerInteractions: Array<{
    date: string;
    title: string;
    customerName: string;
    category: string;
    content: string;
  }>;
  propertyPrice: number;
  saleStartDate: string;
  visitDetails: Array<{
    date: string;
    description: string;
  }>;
  currentStatus: string;
  title: string;
  isDraft: boolean;
}


export interface ReportListData {
  id: string;
  title: string;
  created_at: string;
  report_start_date: string;
  report_end_date: string; 
  is_draft: boolean;
}

export type ReportListResponse = PaginatedListResponse<ReportListData>;

export interface ReportDetailData {
  id: string;
  title: string;
  current_status: ReportStatus;
  summary: string;
  property_id: string;
  is_suumo_published: boolean;
  views_count: number;
  inquiries_count: number;
  business_meeting_count: number;
  viewing_count: number;
  created_at: string;
  customer_interactions: CustomerInteraction[];
}

export type ReportDetailResponse = SuccessResponse<ReportDetailData>;