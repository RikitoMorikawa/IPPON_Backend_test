import { PaginationParams, PaginatedListResponse, PaginatedResponse } from '@src/interfaces/responseInterfaces';
import { InquiryMethod, InquiryType } from '@src/enums/inquiryEnums';
import { RouteGenericInterface } from 'fastify';
import { errorResponse } from './errorInterface';


export interface GetDashboardCustomerParams {
  customerId: string;
}

// ダッシュボード取得時のクエリパラメータ型
export interface DashboardCustomerQueryParams extends PaginationParams {
  name?: string;
  firstName?: string;
  lastName?: string;
  inquiryStartDate?: string;
  inquiryEndDate?: string;
  inquiryMethod?: InquiryMethod;
  propertyId?: string;
  startDate?: string;
  endDate?:string;
  inquiryId?: string;
  employeeId?: string;
}

export interface GetDashboardCustomerRequest extends RouteGenericInterface {
  Params: GetDashboardCustomerParams;
  Querystring: DashboardCustomerQueryParams;
}

export interface DashboardSuccessResponse {
  status: number;
  message: string;
  data: PaginatedResponse<DashboardInquiryData>;
}

export type DashboardResponse = DashboardSuccessResponse | errorResponse;

export interface GetDashboardResponse extends RouteGenericInterface {
  Reply: DashboardResponse;
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
      // 基本情報（共通）
      id: string;
      client_id: string;
      employee_id: string;
      customer_type: string; // 'individual_customer' or 'corporate_customer'
      created_at: string;
      updated_at: string;
      deleted_at: string;
      // 個人顧客の詳細情報（個人顧客の場合のみ）
      individual_customer?: {
        first_name: string;
        last_name: string;
        birthday: string;
        mail_address: string;
        phone_number?: string;
        postcode: string;
        prefecture: string;
        city: string;
        street_address: string;
        building: string;
        id_card_front_path: string;
        id_card_back_path: string;
      };
      // 法人顧客の詳細情報（法人顧客の場合のみ）
      corporate_customer?: {
        // 会社基本情報
        corporate_name: string;
        corporate_name_kana: string;
        head_office_postcode: string;
        head_office_prefecture: string;
        head_office_city: string;
        head_office_street_address: string;
        head_office_building?: string;
        head_office_phone_number?: string;
        head_office_fax_number?: string;
        business_type?: string;
        state_of_listing?: string;
        capital_fund?: string;
        annual_turnover?: string;
        primary_bank?: string;
        employees_count?: string;
        establishment_date?: string;
        
        // 代表者情報
        representative_first_name: string;
        representative_last_name: string;
        representative_first_name_kana: string;
        representative_last_name_kana: string;
        representative_mobile_number: string;
        representative_postcode: string;
        representative_prefecture: string;
        representative_city: string;
        representative_street_address: string;
        representative_building?: string;
        representative_id_card_front_path: string;
        representative_id_card_back_path: string;
        
        // 担当者情報
        manager_first_name: string;
        manager_last_name: string;
        manager_first_name_kana: string;
        manager_last_name_kana: string;
        manager_phone_number: string;
        manager_fax_number?: string;
        manager_email_address?: string;
        manager_department?: string;
        manager_position?: string;
        manager_id_card_front_path: string;
        manager_id_card_back_path: string;
        manager_postcode: string;
        manager_prefecture: string;
        manager_city: string;
        manager_street_address?: string;
        manager_building?: string;
        
        // 連帯保証人情報（全て任意）
        guarantor_last_name?: string;
        guarantor_first_name?: string;
        guarantor_last_name_kana?: string;
        guarantor_first_name_kana?: string;
        guarantor_gender?: string;
        guarantor_nationality?: string;
        guarantor_birthday?: string;
        guarantor_age?: string;
        guarantor_relationship?: string;
        guarantor_mobile_phone_number?: string;
        guarantor_home_phone_number?: string;
        guarantor_email_address?: string;
        guarantor_postal_code?: string;
        guarantor_prefecture?: string;
        guarantor_city?: string;
        guarantor_street_address?: string;
        guarantor_building?: string;
        guarantor_residence_type?: string;
        guarantor_work_school_name?: string;
        guarantor_work_school_name_kana?: string;
        guarantor_work_phone_number?: string;
        guarantor_work_address?: string;
        guarantor_department?: string;
        guarantor_position?: string;
        guarantor_industry?: string;
        guarantor_capital?: string;
        guarantor_employee_count?: string;
        guarantor_establishment_date?: string;
        guarantor_service_years?: string;
        guarantor_service_months?: string;
        guarantor_annual_income_gross?: string;
        
        // 提出書類（全て任意）
        company_registration?: string[];
        supplementary_doc_1?: string[];
        supplementary_doc_2?: string[];
        
        // 決算書（全て任意）
        previous_pl_statement?: string[];
        previous_balance_sheet?: string[];
        two_years_ago_pl_statement?: string[];
        two_years_ago_balance_sheet?: string[];
        three_years_ago_pl_statement?: string[];
        three_years_ago_balance_sheet?: string[];
      };
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
