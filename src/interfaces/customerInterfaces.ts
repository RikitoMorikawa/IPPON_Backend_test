import { CustomerDetail, IndividualCustomerDetail, CorporateCustomerDetail } from '@src/models/customerType';
import { CustomerType } from '@src/enums/customerEnums';

// ============================================
// 顧客API型定義
// ============================================

// 顧客作成リクエスト
export interface CreateCustomerRequest {
  customer_type: CustomerType;
  employee_id: string;
  property_ids: string[];
  individual_customer_details?: IndividualCustomerDetail;
  corporate_customer_details?: CorporateCustomerDetail;
}

// 顧客更新リクエスト
export interface UpdateCustomerRequest {
  customer_type?: CustomerType;
  employee_id?: string;
  property_ids?: string[];
  individual_customer_details?: Partial<IndividualCustomerDetail>;
  corporate_customer_details?: Partial<CorporateCustomerDetail>;
}

// 顧客一覧取得のクエリパラメータ
export interface GetCustomersQuery {
  page?: string;
  limit?: string;
  customer_type?: CustomerType;
  employee_id?: string;
  search?: string; // 名前での検索
  sort?: 'created_at' | 'updated_at';
  order?: 'asc' | 'desc';
}

// 顧客一覧取得レスポンス
export interface GetCustomersResponse {
  total: number;
  page: number;
  limit: number;
  items: CustomerDetail[];
}

// 顧客詳細取得レスポンス
export interface GetCustomerDetailResponse {
  customer: CustomerDetail;
  inquiries?: any[]; // 問い合わせ情報
}

// 顧客削除リクエスト
export interface DeleteCustomersRequest {
  customer_ids: string[];
}

// 顧客削除レスポンス
export interface DeleteCustomersResponse {
  customersDeleted: number;
  inquiriesDeleted: number;
  notFoundCustomerIds?: string[];
  errors?: string[];
}

// ============================================
// パラメータ型定義
// ============================================

// 顧客ID パラメータ
export interface CustomerParams {
  customerId: string;
}

// ============================================
// フォームデータ処理用の型定義
// ============================================

// 個人顧客フォームデータ
export interface IndividualCustomerFormData {
  customer_type: 'individual_customer';
  employee_id: string;
  property_ids: string[];
  // 個人顧客の詳細情報
  first_name: string;
  last_name: string;
  middle_name?: string;
  first_name_kana: string;
  last_name_kana: string;
  middle_name_kana?: string;
  birthday: string;
  gender: string;
  mail_address: string;
  phone_number: string;
  postcode: string;
  prefecture: string;
  city: string;
  street_address: string;
  building?: string;
  room_number?: string;
  id_card_front?: string; // Base64またはURL
  id_card_back?: string;  // Base64またはURL
  // 問い合わせ情報（顧客作成時）
  inquiry_type?: string;
  inquiry_method?: string;
  inquiry_summary?: string;
  inquiry_category?: string;
  property_name?: string;
}

// 法人顧客フォームデータ
export interface CorporateCustomerFormData {
  customer_type: 'corporate_customer';
  employee_id: string;
  property_ids: string[];
  // 法人顧客の詳細情報
  corporate_name: string;
  corporate_name_kana: string;
  head_office_postcode: string;
  head_office_prefecture: string;
  head_office_city: string;
  head_office_street_address: string;
  head_office_building?: string;
  representative_last_name: string;
  representative_first_name: string;
  representative_last_name_kana: string;
  representative_first_name_kana: string;
  representative_mobile_number: string;
  representative_postcode: string;
  representative_prefecture: string;
  representative_city: string;
  representative_street_address: string;
  representative_building?: string;
  representative_id_card_front?: string;
  representative_id_card_back?: string;
  manager_last_name: string;
  manager_first_name: string;
  manager_last_name_kana: string;
  manager_first_name_kana: string;
  manager_phone_number: string;
  manager_id_card_front?: string;
  manager_id_card_back?: string;
  manager_postcode: string;
  manager_prefecture: string;
  manager_city: string;
  manager_street_address: string;
  manager_building?: string;  
  // 問い合わせ情報（顧客作成時）
  inquiry_type?: string;
  inquiry_method?: string;
  inquiry_summary?: string;
  inquiry_category?: string;
  property_name?: string;
}

// 統合フォームデータ型
export type CustomerFormData = IndividualCustomerFormData | CorporateCustomerFormData;
