// Property information
export interface Property {
  id: string;
  name: string;
  address: string;
}

// 顧客対応内容
export interface CustomerInteraction {
  customer_id?: string;
  date?: string; // 対応日
  title?: string; // 対応タイトル
  customer_name?: string;
  category?: string; // 対応カテゴリ（電話、内見等）
  content?: string; // 内容の自由記述
}

// ポータル掲載情報
export interface PortalData {
  suumo?: {
    published: boolean;
    views?: number;
    inquiries?: number;
    listing_url?: string;
  };
  // 他のポータルサイト情報も拡張可能
  [portalName: string]: any;
}

export interface Report {
  id: string; // RDB PK
  client_id: string; // DynamoDB PK
  property_id: string;
  report_start_date: string;
  report_end_date: string;
  title?: string;
  is_draft?: boolean;
  report_date?: string;
  current_status?: string;
  summary?: string;
  price: string; // 当初売出価格（物件テーブルから取得）
  sales_start_date: string; // 売出開始日（物件テーブルから取得）
  is_suumo_published?: boolean;
  views_count?: number; // 手動入力された閲覧数
  inquiries_count?: number; // 手動入力された問い合わせ数
  business_meeting_count?: number;
  viewing_count?: number;
  suumo_views_api?: number; // SUUMO APIから取得した閲覧数
  suumo_inquiries_api?: number; // SUUMO APIから取得した問い合わせ数
  portal_data?: PortalData; // ポータル別情報
  customer_interactions?: CustomerInteraction[];
  created_at: string; // DynamoDB SK
  updated_at?: string;
  deleted_at?: string;
}

// Report list response
export interface ReportListResponse {
  property: Property;
  reports: Report[];
  pagination: {
    next_token: string;
    prev_token: string;
    limit: number;
  };
}

// Report query parameters
export interface GetReportsQueryParams {
  limit?: number;
  next_token?: string;
  prev_token?: string;
}
