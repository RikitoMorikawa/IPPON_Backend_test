/**
 * Property（物件情報）テーブルの型定義
 * DynamoDBスキーマに基づく完全な型定義
 */

import { PropertyType, PrefectureName } from '@src/enums/propertyEnums';

// 最寄り駅情報の型
export interface NearestStation {
  line_name: string;        // 路線名
  station_name: string;     // 駅名
  walk_minutes: number;     // 徒歩分数
}

// 物件共通の基本フィールド
interface BaseProperty {
  // 必須フィールド
  id: string;                    // RDB PK (UUID)
  client_id: string;             // DynamoDB PK
  name: string;                  // 物件名
  postal_code: string;           // 郵便番号
  prefecture: PrefectureName;    // 都道府県
  city: string;                  // 市区町村
  block_number: string;          // 番地
  owner_last_name: string;       // 所有者姓
  owner_first_name: string;      // 所有者名
  sales_start_date: string;      // 売出開始日 (ISO 8601)
  price: number;                 // 価格
  inquiry_count: number;         // 問い合わせ数
  created_at: string;            // 作成日時 (DynamoDB SK, ISO 8601)

  // オプションフィールド（共通）
  building?: string;             // 建物名
  room_number?: string;          // 部屋番号
  nearest_stations?: NearestStation[];  // 最寄り駅情報
  owner_last_name_kana?: string; // 所有者姓（カナ）
  owner_first_name_kana?: string; // 所有者名（カナ）
  delivery_time?: string;        // 引き渡し時期
  delivery_method?: string;      // 引き渡し方法
  transaction_type?: string;     // 取引形態
  current_condition?: string;    // 現況
  image_urls?: string[];         // 画像URL
  remarks?: string;              // 備考
  details?: Record<string, any>; // 物件詳細
  updated_at?: string;           // 更新日時 (ISO 8601)
  deleted_at?: string;           // 削除日時 (ISO 8601)
}

// 土地物件の型
export interface LandProperty extends BaseProperty {
  type: '土地';
  // 土地固有フィールド
  land_area?: number;            // 土地面積
  land_rights?: string;          // 土地権利
  land_category?: string;        // 土地カテゴリ
  usage_zone?: string;           // 用途地域
  building_coverage?: number;    // 建ぺい率
  floor_area_ratio?: number;     // 容積率
  road_situation?: string;       // 道路状況
}

// マンション物件の型
export interface ApartmentProperty extends BaseProperty {
  type: 'マンション';
  // マンション固有フィールド
  private_area?: number;         // 専有面積
  balcony_area?: number;         // バルコニー面積
  layout?: string;               // 間取り
  total_units?: number;          // 総戸数
  management_fee?: number;       // 管理費
  repair_fund?: number;          // 修繕積立金
  community_fee?: number;        // 共益費
  parking?: string;              // 駐車場
  management_type?: string;      // 管理形態
  structure?: string;            // 構造
  built_year?: number;           // 築年
}

// 新築物件の型
export interface NewHouseProperty extends BaseProperty {
  type: '新築';
  // 新築固有フィールド
  floor_area?: number;           // 床面積
  topography?: string;           // 地形
  facilities?: string[];         // 設備
  school_area?: string;          // 学区
}

// 統合した物件型
export type Property = LandProperty | ApartmentProperty | NewHouseProperty;

// 物件作成用の型
export interface CreateLandProperty {
  client_id: string;
  name: string;
  type: '土地';
  postal_code: string;
  prefecture: PrefectureName;
  city: string;
  block_number: string;
  owner_last_name: string;
  owner_first_name: string;
  sales_start_date: string;
  price: number;
  inquiry_count?: number;
  // 共通オプション
  building?: string;
  room_number?: string;
  nearest_stations?: NearestStation[];
  owner_last_name_kana?: string;
  owner_first_name_kana?: string;
  delivery_time?: string;
  delivery_method?: string;
  transaction_type?: string;
  current_condition?: string;
  image_urls?: string[];
  remarks?: string;
  details?: Record<string, any>;
  // 土地固有
  land_area?: number;
  land_rights?: string;
  land_category?: string;
  usage_zone?: string;
  building_coverage?: number;
  floor_area_ratio?: number;
  road_situation?: string;
}

export interface CreateApartmentProperty {
  client_id: string;
  name: string;
  type: 'マンション';
  postal_code: string;
  prefecture: PrefectureName;
  city: string;
  block_number: string;
  owner_last_name: string;
  owner_first_name: string;
  sales_start_date: string;
  price: number;
  inquiry_count?: number;
  // 共通オプション
  building?: string;
  room_number?: string;
  nearest_stations?: NearestStation[];
  owner_last_name_kana?: string;
  owner_first_name_kana?: string;
  delivery_time?: string;
  delivery_method?: string;
  transaction_type?: string;
  current_condition?: string;
  image_urls?: string[];
  remarks?: string;
  details?: Record<string, any>;
  // マンション固有
  private_area?: number;
  balcony_area?: number;
  layout?: string;
  total_units?: number;
  management_fee?: number;
  repair_fund?: number;
  community_fee?: number;
  parking?: string;
  management_type?: string;
  structure?: string;
  built_year?: number;
}

export interface CreateNewHouseProperty {
  client_id: string;
  name: string;
  type: '新築';
  postal_code: string;
  prefecture: PrefectureName;
  city: string;
  block_number: string;
  owner_last_name: string;
  owner_first_name: string;
  sales_start_date: string;
  price: number;
  inquiry_count?: number;
  // 共通オプション
  building?: string;
  room_number?: string;
  nearest_stations?: NearestStation[];
  owner_last_name_kana?: string;
  owner_first_name_kana?: string;
  delivery_time?: string;
  delivery_method?: string;
  transaction_type?: string;
  current_condition?: string;
  image_urls?: string[];
  remarks?: string;
  details?: Record<string, any>;
  // 新築固有
  floor_area?: number;
  topography?: string;
  facilities?: string[];
  school_area?: string;
}

// 統合した作成用型
export type CreateProperty = CreateLandProperty | CreateApartmentProperty | CreateNewHouseProperty;

// 物件更新用の型（部分的な更新を許可）
export interface UpdateProperty {
  name?: string;
  postal_code?: string;
  prefecture?: PrefectureName;
  city?: string;
  block_number?: string;
  building?: string;
  room_number?: string;
  nearest_stations?: NearestStation[];
  owner_last_name?: string;
  owner_first_name?: string;
  owner_last_name_kana?: string;
  owner_first_name_kana?: string;
  sales_start_date?: string;
  price?: number;
  delivery_time?: string;
  delivery_method?: string;
  transaction_type?: string;
  current_condition?: string;
  image_urls?: string[];
  remarks?: string;
  details?: Record<string, any>;
  inquiry_count?: number;
  // 物件固有フィールドは型に応じて動的に設定
  [key: string]: any;
}

// 物件検索用のフィルター型
export interface PropertyFilter {
  client_id?: string;
  type?: PropertyType;
  prefecture?: PrefectureName;
  city?: string;
  price_from?: number;
  price_to?: number;
  sales_start_date_from?: string;
  sales_start_date_to?: string;
  created_at_from?: string;
  created_at_to?: string;
  // 土地固有フィルター
  land_area_from?: number;
  land_area_to?: number;
  // マンション固有フィルター
  private_area_from?: number;
  private_area_to?: number;
  layout?: string;
  // 新築固有フィルター
  floor_area_from?: number;
  floor_area_to?: number;
}

// 物件リスト表示用の型
export interface PropertyListItem {
  id: string;
  name: string;
  type: PropertyType;
  prefecture: PrefectureName;
  city: string;
  price: number;
  sales_start_date: string;
  inquiry_count: number;
  created_at: string;
}

// 物件詳細表示用の型
export type PropertyDetail = Property & {
  // 必要に応じて関連データを含める場合の拡張用
  // owner_full_name?: string;
  // formatted_address?: string;
  // related_inquiries_count?: number;
};

// 型ガード関数
export const isLandProperty = (property: Property): property is LandProperty => {
  return property.type === '土地';
};

export const isApartmentProperty = (property: Property): property is ApartmentProperty => {
  return property.type === 'マンション';
};

export const isNewHouseProperty = (property: Property): property is NewHouseProperty => {
  return property.type === '新築';
}; 