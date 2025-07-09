import { PaginationParams, PaginatedListResponse } from '@src/interfaces/responseInterfaces';
import { InquiryMethod, InquiryType } from '@src/enums/inquiryEnums';


// ダッシュボード取得時のクエリパラメータ型
export interface DashboardCustomerQueryParams extends PaginationParams {
  firstName?: string;
  lastName?: string;
  inquiryTimestamp?: string;
  inquiryMethod?: InquiryMethod;
  propertyId?: string;
  startDate?: string;
  endDate?:string;
  inquiryId?: string;
  employeeId?: string;
}
// ダッシュボード問い合わせ一覧データ型
export interface DashboardInquiryData {
  inquiry: {
    id: string;
    method: InquiryMethod;
    type: InquiryType;
    summary: string;
    created_at: string;
    property: {
      id: string;
      name: string;
    };
    customer: {
      id: string;
      first_name: string;
      last_name: string;
      mail_address: string;
      phone_number: string;
      employee_id: string;
    };
    employee: {
      id: string;
      first_name: string;
      last_name: string;
      mail_address: string;
    };
  };
}
// ダッシュボード一覧レスポンス型（完全なAPIレスポンス構造）
export type DashboardInquiryResponse = PaginatedListResponse<DashboardInquiryData>; 

