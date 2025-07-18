/**
 * IndividualCustomerDetail（個人顧客詳細）テーブルの型定義
 * DynamoDBスキーマに基づく完全な型定義
 */

import { Gender, PrefectureName, CustomerType, ListingStatus } from '@src/enums/customerEnums';

// 個人顧客詳細
export interface IndividualCustomerDetail {
  first_name: string;            // 姓
  last_name: string;             // 名
  middle_name?: string;          // ミドルネーム
  first_name_kana: string;       // 姓(カナ)
  last_name_kana: string;        // 名(カナ)
  middle_name_kana?: string;     // ミドルネーム(カナ)
  birthday: string;              // 生年月日 (YYYYMMDD)
  gender: Gender;                // 性別
  mail_address: string;          // メールアドレス
  phone_number: string;          // 電話番号
  postcode: string;              // 郵便番号(ハイフンなし)
  prefecture: PrefectureName;    // 都道府県
  city: string;                  // 市区町村
  street_address: string;        // 番地・区画
  building?: string;             // 建物
  room_number?: string;          // 部屋番号
  id_card_front_path: string;    // 身分証明書（表）保管先S3パス
  id_card_back_path: string;     // 身分証明書（裏）保管先S3パス
}

// 法人顧客詳細
export interface CorporateCustomerDetail {
  // 会社基本情報
  corporate_name: string;                    // 会社名(漢字) - 必須
  corporate_name_kana: string;               // 会社名(カナ) - 必須
  head_office_postcode: string;              // 本社所在地_郵便番号 - 必須
  head_office_prefecture: PrefectureName;    // 本社所在地_都道府県 - 必須
  head_office_city: string;                  // 本社所在地_市区町村 - 必須
  head_office_street_address: string;        // 本社所在地_丁目・番地 - 必須
  head_office_building?: string;             // 本社所在地_建物名・部屋番号 - 任意
  head_office_phone_number?: string;         // 本社電話番号 - 任意
  head_office_fax_number?: string;           // 本社FAX番号 - 任意
  business_type?: string;                    // 業種 - 任意
  state_of_listing?: ListingStatus;          // 上場 - 任意
  capital_fund?: string;                     // 資本金 - 任意
  annual_turnover?: string;                  // 年商 - 任意
  primary_bank?: string;                     // 取引銀行 - 任意
  employees_count?: string;                  // 従業員数 - 任意
  establishment_date?: string;               // 設立年月日 - 任意

  // 会社代表者情報
  representative_last_name: string;          // 氏名_苗字(漢字) - 必須
  representative_first_name: string;         // 氏名_名前(漢字) - 必須
  representative_last_name_kana: string;     // 氏名_苗字(カナ) - 必須
  representative_first_name_kana: string;    // 氏名_名前(カナ) - 必須
  representative_mobile_number: string;      // 携帯電話番号 - 必須
  representative_postcode: string;           // 現住所_郵便番号 - 必須
  representative_prefecture: PrefectureName; // 現住所_都道府県 - 必須
  representative_city: string;               // 現住所_市区町村 - 必須
  representative_street_address: string;     // 現住所_丁目・番地 - 必須
  representative_building?: string;          // 現住所_建物名・部屋番号 - 任意
  representative_id_card_front_path: string; // 身分証明書（表） - 必須
  representative_id_card_back_path: string;  // 身分証明書（裏） - 必須

  // 担当者情報
  manager_last_name: string;                 // 担当者名_苗字(漢字) - 必須
  manager_first_name: string;                // 担当者名_名前(漢字) - 必須
  manager_last_name_kana: string;            // 担当者名_苗字(カナ) - 必須
  manager_first_name_kana: string;           // 担当者名_名前(カナ) - 必須
  manager_phone_number: string;              // 担当者電話番号 - 必須
  manager_fax_number?: string;               // 担当者FAX番号 - 任意
  manager_email_address?: string;            // 担当者メールアドレス - 任意
  manager_department?: string;               // 担当者所属部署 - 任意
  manager_position?: string;                 // 担当者役職 - 任意
  manager_id_card_front_path: string;        // 身分証明書（表）保管先S3パス - 必須
  manager_id_card_back_path: string;         // 身分証明書（裏）保管先S3パス - 必須
  manager_postcode: string;                  // 郵便番号 - 必須
  manager_prefecture: PrefectureName;        // 都道府県 - 必須
  manager_city: string;                      // 市区町村 - 必須
  manager_street_address?: string;           // 丁目・番地 - 任意
  manager_building?: string;                 // 建物名・部屋番号 - 任意

  // 連帯保証人情報（全て任意）
  guarantor_last_name?: string;              // 苗字(漢字)
  guarantor_first_name?: string;             // 名前(漢字)
  guarantor_last_name_kana?: string;         // 苗字(カナ)
  guarantor_first_name_kana?: string;        // 名前(カナ)
  guarantor_gender?: Gender;                 // 性別
  guarantor_nationality?: string;            // 国籍
  guarantor_birthday?: string;               // 生年月日(YYYYMMDD)
  guarantor_age?: string;                    // 年齢
  guarantor_relationship?: string;           // 続柄
  guarantor_mobile_phone_number?: string;    // 携帯電話番号
  guarantor_home_phone_number?: string;      // 自宅電話番号
  guarantor_email_address?: string;          // メールアドレス
  guarantor_postal_code?: string;            // 現住所_郵便番号
  guarantor_prefecture?: PrefectureName;     // 現住所_都道府県
  guarantor_city?: string;                   // 現住所_市区町村
  guarantor_street_address?: string;         // 現住所_丁目・番地
  guarantor_building?: string;               // 現住所_建物名・部屋番号
  guarantor_residence_type?: string;         // 住居種別
  guarantor_work_school_name?: string;       // 勤務先/学校名
  guarantor_work_school_name_kana?: string;  // 勤務先/学校名(カナ)
  guarantor_work_phone_number?: string;      // 勤務先電話番号
  guarantor_work_address?: string;           // 勤務先所在地
  guarantor_department?: string;             // 所属部署
  guarantor_position?: string;               // 役職名
  guarantor_industry?: string;               // 業種
  guarantor_capital?: string;                // 資本金
  guarantor_employee_count?: string;         // 従業員数（フロントエンドに合わせて修正）
  guarantor_establishment_date?: string;     // 設立年月日
  guarantor_service_years?: string;          // 勤続年数(年)
  guarantor_service_months?: string;         // 勤続年数(ヵ月)
  guarantor_annual_income_gross?: string;    // 税込年収

  // 提出書類（全て任意）
  company_registration?: string[];           // 会社謄本（配列に修正）
  supplementary_doc_1?: string[];            // 補足書類1枚目（配列に修正）
  supplementary_doc_2?: string[];            // 補足書類2枚目（配列に修正）

  // 決算書（全て任意）
  previous_pl_statement?: string[];          // 1期前の決算書(損益計算書)（配列に修正）
  previous_balance_sheet?: string[];         // 1期前の決算書(貸借対照表)（配列に修正）
  two_years_ago_pl_statement?: string[];     // 2期前の決算書(損益計算書)（配列に修正）
  two_years_ago_balance_sheet?: string[];    // 2期前の決算書(貸借対照表)（配列に修正）
  three_years_ago_pl_statement?: string[];   // 3期前の決算書(損益計算書)（配列に修正）
  three_years_ago_balance_sheet?: string[];  // 3期前の決算書(貸借対照表)（配列に修正）
}

// 顧客詳細の基本型
export interface CustomerDetail {
  // 必須フィールド
  id: string;                    // RDB PK (UUID)
  client_id: string;             // DynamoDB PK
  employee_id: string;           // 担当従業員ID
  customer_type: CustomerType;   // 顧客種別
  property_ids: string[];        // 物件ID (配列)
  // オプションフィールド
  individual_customer_details?: IndividualCustomerDetail; // 個人顧客詳細
  corporate_customer_details?: CorporateCustomerDetail;   // 法人顧客詳細
  created_at: string;            // 作成日時 (DynamoDB SK, ISO 8601)
  updated_at?: string;           // 更新日時 (ISO 8601)
  deleted_at?: string;           // 削除日時 (ISO 8601)
}
