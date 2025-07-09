/**
 * IndividualCustomerDetail（個人顧客詳細）テーブルの型定義
 * DynamoDBスキーマに基づく完全な型定義
 */

import { Gender, PrefectureName } from '@src/enums/customerEnums';

// 個人顧客詳細の基本型
export interface IndividualCustomerDetail {
  // 必須フィールド
  id: string;                    // RDB PK (UUID)
  client_id: string;             // DynamoDB PK
  employee_id: string;           // 担当従業員ID
  first_name: string;            // 名
  last_name: string;             // 姓
  birthday: string;              // 生年月日 (ISO 8601)
  mail_address: string;          // メールアドレス
  postcode: string;              // 郵便番号
  prefecture: PrefectureName;    // 都道府県
  city: string;                  // 市区町村
  street_address: string;        // 番地
  building: string;              // 建物名
  id_card_front_path: string;    // 身分証明書表面パス
  id_card_back_path: string;     // 身分証明書裏面パス
  created_at: string;            // 作成日時 (DynamoDB SK, ISO 8601)

  // オプションフィールド
  middle_name?: string;          // ミドルネーム
  first_name_kana?: string;      // 名（カナ）
  middle_name_kana?: string;     // ミドルネーム（カナ）
  last_name_kana?: string;       // 姓（カナ）
  gender?: Gender;               // 性別
  phone_number?: string;         // 電話番号
  room_number?: string;          // 部屋番号
  updated_at?: string;           // 更新日時 (ISO 8601)
  deleted_at?: string;           // 削除日時 (ISO 8601)
}
