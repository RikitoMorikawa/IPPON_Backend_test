import { FastifyRequest } from 'fastify';

export interface PropertySearchParams {
  objectName?: string;
  registrationRange?: string;
  prefecture?: string;
  exclusive_area?: string;
  property_type?: string;
  price?: string;
  limit?: string;
  page?: string;
  lastKey?: string;
}

export interface LinkedProperty {
  property_id: string;
  [key: string]: any;
}

export interface PropertyParams {
  propId: string;
}

export interface PropertyDeleteRequest extends FastifyRequest {
  params: PropertyParams;
}

export interface PropertyDeleteRequestBody {
  propIds?: string[];
}

export interface Property {
  id: string; // RDB PK
  client_id: string; // DynamoDB PK
  name: string;
  type: string; // "land", "apartment", "new_house"
  postal_code: string;
  prefecture: string;
  city: string;
  block_number: string;
  building?: string;
  room_number?: string;
  nearest_stations?: NearestStationData[];
  owner_last_name: string;
  owner_first_name: string;
  owner_last_name_kana?: string;
  owner_first_name_kana?: string;
  sales_start_date: string;
  price: number;
  delivery_time?: string;
  delivery_method?: string;
  transaction_type?: string;
  current_condition?: string;
  image_urls?: string[];
  remarks?: string;
  details?: PropertyDetails;
  created_at: string; // DynamoDB SK
  updated_at?: string;
  deleted_at?: string;
  inquiry_count: number;
}

// 物件タイプ別詳細情報の型定義
export interface PropertyDetails {
  // 共通フィールド（複数タイプで使用）
  land_area?: number; // 土地面積（土地・新築）
  land_rights?: string; // 土地権利（土地・新築）
  land_category?: string; // 地目（土地・新築）
  usage_zone?: string; // 用途地域（土地・新築）
  building_coverage?: number; // 建ぺい率（土地・新築）
  floor_area_ratio?: number; // 容積率（土地・新築）
  road_situation?: string; // 接道状況（土地・新築）
  layout?: string; // 間取り（マンション・新築）
  structure?: string; // 建物構造（マンション・新築）
  built_year?: string; // 築年月（マンション・新築）

  // マンション固有情報
  private_area?: number; // 専有面積
  balcony_area?: number; // バルコニー面積
  total_units?: number; // 総戸数
  management_fee?: number; // 管理費
  repair_fund?: number; // 修繕積立金
  community_fee?: string; // 自治会費
  parking?: string; // 駐車場
  management_type?: string; // 管理方式

  // 新築固有情報
  floor_area?: number; // 延床面積
  topography?: string; // 地勢
  facilities?: string; // 設備
  school_area?: string; // 学区

  [key: string]: any;
}


export interface NearestStationData {
  line_name: string;
  station_name: string;
  walk_minutes: number;
}
