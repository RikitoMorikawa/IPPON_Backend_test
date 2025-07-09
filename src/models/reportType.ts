/**
 * AiReport（報告書）テーブルの型定義
 * DynamoDBスキーマに基づく完全な型定義
 */

import { ReportStatus } from '@src/enums/reportEnums';

// 顧客対応履歴の型
export interface CustomerInteraction {
  title: string;
  date: string;               // 対応日時 (ISO 8601)
  customer_id?: string;       // 顧客ID
  customer_name?: string;     // 顧客名
  content: string;            // 対応内容
  category: string;           // 対応カテゴリ
}


// 報告書の基本型
export interface Report {
  // 必須フィールド
  id: string;                    // RDB PK (UUID)
  client_id: string;             // DynamoDB PK
  property_id: string;           // 物件ID
  report_start_date: string;     // 報告期間開始日 (ISO 8601)
  report_end_date: string;       // 報告期間終了日 (ISO 8601)
  price: string;                 // 当初売出価格
  sales_start_date: string;      // 売出開始日 (ISO 8601)
  created_at: string;            // 作成日時 (DynamoDB SK, ISO 8601)

  // オプションフィールド（共通）
  is_draft?: boolean;            // 下書きフラグ
  title?: string;                // 報告書タイトル
  report_date?: string;          // 報告日 (ISO 8601)
  current_status?: ReportStatus; // 現在の状況
  summary?: string;              // 概要
  is_suumo_published?: boolean;  // SUUMO掲載フラグ
  views_count?: number;          // 閲覧数（手動入力）
  inquiries_count?: number;      // 問い合わせ数（手動入力）
  business_meeting_count?: number; // 商談数
  viewing_count?: number;        // 内見数
  customer_interactions?: CustomerInteraction[]; // 顧客対応履歴
  updated_at?: string;           // 更新日時 (ISO 8601)
  deleted_at?: string;           // 削除日時 (ISO 8601)
}
