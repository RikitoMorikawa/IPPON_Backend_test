/**
 * Inquiry（問い合わせ情報）テーブルの型定義
 * DynamoDBスキーマに基づく完全な型定義
 */

import {
  InquiryCategory,
  InquiryType,
  InquiryMethod,
  INQUIRY_TITLES,
  INQUIRY_CATEGORIES
} from '@src/enums/inquiryEnums';

// 問い合わせ情報の基本型
export interface Inquiry {
  // 必須フィールド
  id: string;                    // RDB PK (UUID)
  client_id: string;             // DynamoDB PK
  customer_id: string;           // 個人顧客ID
  inquired_at: string;           // 問い合わせ日時 (DynamoDB SK, ISO 8601)
  method: InquiryMethod;         // 問い合わせ方法
  created_at: string;            // 作成日時 (ISO 8601)

  // オプションフィールド
  property_id?: string;          // 物件ID
  employee_id?: string;          // 担当従業員ID
  title?: string;          // 問い合わせタイトル
  category?: InquiryCategory;    // 問い合わせカテゴリ
  type?: InquiryType;            // 問い合わせ種別
  summary?: string;              // 問い合わせ概要
  updated_at?: string;           // 更新日時 (ISO 8601)
  deleted_at?: string;           // 削除日時 (ISO 8601)
}

export interface NewInquiry extends Inquiry {
  title: typeof INQUIRY_TITLES.NEW_INQUIRY;           // '新規問い合わせ'
  category: typeof INQUIRY_CATEGORIES.NEW_INQUIRY;    // '問い合わせ（新規）'
}

export interface OtherInquiry extends Inquiry {
  title?: never;                                      // 新規以外では使用しない
  category: typeof INQUIRY_CATEGORIES.GENERAL_INQUIRY | 
           typeof INQUIRY_CATEGORIES.BUSINESS_MEETING | 
           typeof INQUIRY_CATEGORIES.VIEWING;
}