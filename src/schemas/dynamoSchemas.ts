/**
 * DynamoDB テーブル構造の統一定義
 * 
 * このファイルは以下の目的で作成されています：
 * 1. 各テーブルの正確な構造を一箇所で管理
 * 2. TypeScriptインターフェースとの整合性を保つ
 * 3. 動的なデータ投入による予期しないフィールドの混入を防ぐ
 * 4. テーブル作成時とデータ操作時の両方で参照する基本軸とする
 */

// ==================================================
// 1. IndividualCustomerDetail（個人顧客詳細テーブル）
// ==================================================
export const IndividualCustomerDetailSchema = {
  tableName: 'IndividualCustomerDetail',
  description: '個人顧客詳細 - 物件購入見込み客の管理',
  
  // DynamoDB構造
  keys: {
    partitionKey: 'client_id',     // PK: クライアントID
    sortKey: 'created_at',         // SK: 作成日時
  },
  
  // 必須フィールド
  requiredFields: [
    'id',                    // RDB PK (UUID)
    'client_id',             // DynamoDB PK
    'employee_id',           // 担当従業員ID
    'first_name',            // 名
    'last_name',             // 姓
    'birthday',              // 生年月日
    'mail_address',          // メールアドレス
    'postcode',              // 郵便番号
    'prefecture',            // 都道府県
    'city',                  // 市区町村
    'street_address',        // 番地
    'building',              // 建物名
    'id_card_front_path',    // 身分証明書表面パス 
    'id_card_back_path',     // 身分証明書裏面パス
    'created_at',            // 作成日時 (DynamoDB SK)
  ],
  
  // オプションフィールド
  optionalFields: [
    'middle_name',           // ミドルネーム
    'first_name_kana',       // 名（カナ）
    'middle_name_kana',      // ミドルネーム（カナ）
    'last_name_kana',        // 姓（カナ）
    'gender',                // 性別
    'phone_number',          // 電話番号
    'room_number',           // 部屋番号
    'updated_at',            // 更新日時
    'deleted_at',            // 削除日時
  ],
  
  // データ型定義
  fieldTypes: {
    id: 'string',
    client_id: 'string',
    employee_id: 'string',
    first_name: 'string',
    last_name: 'string',
    middle_name: 'string',
    first_name_kana: 'string',
    middle_name_kana: 'string',
    last_name_kana: 'string',
    birthday: 'string',      // ISO 8601 形式
    gender: 'string',
    mail_address: 'string',
    phone_number: 'string',
    postcode: 'string',
    prefecture: 'string',
    city: 'string',
    street_address: 'string',
    building: 'string',
    room_number: 'string',
    id_card_front_path: 'string',
    id_card_back_path: 'string',
    created_at: 'string',    // ISO 8601 形式
    updated_at: 'string',
    deleted_at: 'string',
  },
};

// ==================================================
// 2. Inquiry（問い合わせ情報テーブル）
// ==================================================
export const InquirySchema = {
  tableName: 'Inquiry',
  description: '問い合わせ情報 - 顧客からの問い合わせ管理',
  
  // DynamoDB構造
  keys: {
    partitionKey: 'client_id',     // PK: クライアントID
    sortKey: 'inquired_at',        // SK: 問い合わせ日時
  },
  
  // 必須フィールド
  requiredFields: [
    'id',                    // RDB PK (UUID)
    'client_id',             // DynamoDB PK
    'customer_id',           // 個人顧客ID
    'inquired_at',           // 問い合わせ日時 (DynamoDB SK)
    'method',                // 問い合わせ方法
    'created_at',            // 作成日時
  ],
  
  // オプションフィールド
  optionalFields: [
    'property_id',           // 物件ID
    'employee_id',           // 担当従業員ID
    'title',                 // 問い合わせタイトル
    'category',              // 問い合わせカテゴリ
    'type',                  // 問い合わせ種別
    'summary',               // 問い合わせ概要
    'updated_at',            // 更新日時
    'deleted_at',            // 削除日時
  ],
  
  // データ型定義
  fieldTypes: {
    id: 'string',
    client_id: 'string',
    customer_id: 'string',
    property_id: 'string',
    employee_id: 'string',
    inquired_at: 'string',   // ISO 8601 形式
    title: 'string',
    category: 'string',
    type: 'string',
    method: 'string',
    summary: 'string',
    created_at: 'string',    // ISO 8601 形式
    updated_at: 'string',
    deleted_at: 'string',
  },
};

// ==================================================
// 3. Property（物件情報テーブル）
// ==================================================
export const PropertySchema = {
  tableName: 'Property',
  description: '物件情報 - 土地・新築・マンション情報の管理',
  
  // DynamoDB構造
  keys: {
    partitionKey: 'client_id',     // PK: クライアントID
    sortKey: 'created_at',         // SK: 作成日時
  },
  
  // 必須フィールド
  requiredFields: [
    'id',                    // RDB PK (UUID)
    'client_id',             // DynamoDB PK
    'name',                  // 物件名
    'type',                  // 物件種別 ("land", "apartment", "new_house")
    'postal_code',           // 郵便番号
    'prefecture',            // 都道府県
    'city',                  // 市区町村
    'block_number',          // 番地
    'owner_last_name',       // 所有者姓
    'owner_first_name',      // 所有者名
    'sales_start_date',      // 売出開始日
    'price',                 // 価格
    'inquiry_count',         // 問い合わせ数
    'created_at',            // 作成日時 (DynamoDB SK)
  ],
  
  // オプションフィールド
  optionalFields: [
    'building',              // 建物名
    'room_number',           // 部屋番号
    'nearest_stations',      // 最寄り駅情報 (配列 - オブジェクト: line_name, station_name, walk_minutes)
    'owner_last_name_kana',  // 所有者姓（カナ）
    'owner_first_name_kana', // 所有者名（カナ）
    'delivery_time',         // 引き渡し時期
    'delivery_method',       // 引き渡し方法
    'transaction_type',      // 取引形態
    'current_condition',     // 現況
    'image_urls',            // 画像URL (配列)
    'remarks',               // 備考
    'details',               // 物件詳細 (オブジェクト)
    // 土地情報
    'land_area',             // 土地面積
    'land_rights',           // 土地権利
    'land_category',         // 土地カテゴリ
    'usage_zone',            // 用途地域
    'building_coverage',     // 建ぺい率
    'floor_area_ratio',      // 容積率
    'road_situation',        // 道路状況
    // マンション情報
    'private_area',          // 専有面積
    'balcony_area',          // バルコニー面積
    'layout',                // 間取り
    'total_units',           // 総戸数
    'management_fee',        // 管理費
    'repair_fund',           // 修繕積立金
    'community_fee',         // 共益費
    'parking',               // 駐車場
    'management_type',       // 管理形態
    'structure',             // 構造
    'built_year',            // 築年
    // 新築情報
    'floor_area',            // 床面積
    'topography',            // 地形
    'facilities',            // 設備
    'school_area',           // 学区
    'updated_at',            // 更新日時
    'deleted_at',            // 削除日時
  ],
  
  // データ型定義
  fieldTypes: {
    id: 'string',
    client_id: 'string',
    name: 'string',
    type: 'string',
    postal_code: 'string',
    prefecture: 'string',
    city: 'string',
    block_number: 'string',
    building: 'string',
    room_number: 'string',
    nearest_stations: 'array',  // オブジェクト配列: [{line_name, station_name, walk_minutes}]
    owner_last_name: 'string',
    owner_first_name: 'string',
    owner_last_name_kana: 'string',
    owner_first_name_kana: 'string',
    sales_start_date: 'string',
    price: 'number',
    delivery_time: 'string',
    delivery_method: 'string',
    transaction_type: 'string',
    current_condition: 'string',
    image_urls: 'array',
    remarks: 'string',
    details: 'object',
    created_at: 'string',    // ISO 8601 形式
    updated_at: 'string',
    deleted_at: 'string',
    inquiry_count: 'number',
  },
};

// ==================================================
// 4. AiReport（報告書情報テーブル）
// ==================================================
export const AiReportSchema = {
  tableName: 'AiReport',
  description: '報告書情報 - 物件所有者への報告書管理',
  
  // DynamoDB構造
  keys: {
    partitionKey: 'client_id',     // PK: クライアントID
    sortKey: 'created_at',         // SK: 作成日時
  },
  
  // 必須フィールド
  requiredFields: [
    'id',                    // RDB PK (UUID)
    'client_id',             // DynamoDB PK
    'property_id',           // 物件ID
    'report_start_date',     // 報告期間開始日
    'report_end_date',       // 報告期間終了日
    'price',                 // 当初売出価格
    'sales_start_date',      // 売出開始日
    'created_at',            // 作成日時 (DynamoDB SK)
  ],
  
  // オプションフィールド
  optionalFields: [
    'title',                 // 報告書タイトル
    'is_draft',              // 下書きフラグ
    'report_date',           // 報告日
    'current_status',        // 現在の状況
    'summary',               // 概要
    'is_suumo_published',    // SUUMO掲載フラグ
    'views_count',           // 閲覧数（手動入力）
    'inquiries_count',       // 問い合わせ数（手動入力）
    'business_meeting_count', // 商談数
    'viewing_count',         // 内見数
    'suumo_views_api',       // SUUMO閲覧数（API取得）
    'suumo_inquiries_api',   // SUUMO問い合わせ数（API取得）
    'customer_interactions', // 顧客対応履歴 (配列)
    'updated_at',            // 更新日時
    'deleted_at',            // 削除日時
  ],
  
  // データ型定義
  fieldTypes: {
    id: 'string',
    client_id: 'string',
    property_id: 'string',
    report_start_date: 'string',
    report_end_date: 'string',
    title: 'string',
    is_draft: 'boolean',
    report_date: 'string',
    current_status: 'string',
    summary: 'string',
    price: 'string',
    sales_start_date: 'string',
    is_suumo_published: 'boolean',
    views_count: 'number',
    inquiries_count: 'number',
    business_meeting_count: 'number',
    viewing_count: 'number',
    suumo_views_api: 'number',
    suumo_inquiries_api: 'number',
    customer_interactions: 'array',
    created_at: 'string',    // ISO 8601 形式
    updated_at: 'string',
    deleted_at: 'string',
  },
};

// ==================================================
// 5. BatchReportSetting（バッチレポート設定テーブル）
// ==================================================
export const BatchReportSettingSchema = {
  tableName: 'BatchReportSetting',
  description: 'バッチレポート設定 - 自動レポート生成設定の管理',
  
  // DynamoDB構造
  keys: {
    partitionKey: 'client_id',     // PK: クライアントID
    sortKey: 'created_at',         // SK: 作成日時
  },
  
  // 必須フィールド
  requiredFields: [
    'id',                    // RDB PK (UUID)
    'client_id',             // DynamoDB PK
    'property_id',           // 物件ID
    'start_date',            // 開始日
    'weekday',               // 曜日
    'auto_create_period',    // 自動作成期間 ("1週間" | "2週間")
    'auto_generate',         // AI自動生成フラグ
    'execution_time',        // 実行時刻
    'next_execution_date',   // 次回実行日時
    'status',                // ステータス ("active" | "paused" | "completed")
    'execution_count',       // 実行回数
    'created_at',            // 作成日時 (DynamoDB SK)
    'updated_at',            // 更新日時
    'employee_id',           // 作成した従業員ID
  ],
  
  // オプションフィールド
  optionalFields: [
    'property_name',         // 物件名（キャッシュ用）
    'last_execution_date',   // 最後実行日時
    'deleted_at',            // 削除日時
  ],
  
  // データ型定義
  fieldTypes: {
    id: 'string',
    client_id: 'string',
    property_id: 'string',
    property_name: 'string',
    weekday: 'string',
    start_date: 'string',            // YYYY-MM-DD形式
    auto_create_period: 'string',    // "1週間" | "2週間"
    auto_generate: 'boolean',
    execution_time: 'string',        // HH:mm形式
    next_execution_date: 'string',   // ISO 8601形式
    status: 'string',                // "active" | "paused" | "completed"
    last_execution_date: 'string',   // ISO 8601形式
    execution_count: 'number',
    created_at: 'string',            // ISO 8601形式
    updated_at: 'string',            // ISO 8601形式
    employee_id: 'string',
    deleted_at: 'string',
  },
};

// ==================================================
// 統合定義
// ==================================================
export const DynamoDBSchemas = {
  IndividualCustomerDetail: IndividualCustomerDetailSchema,
  Inquiry: InquirySchema,
  Property: PropertySchema,
  AiReport: AiReportSchema,
  BatchReportSetting: BatchReportSettingSchema,
};

// テーブル名とスキーマのマッピング
export const getSchemaByTableName = (tableName: string) => {
  const schemaMap: Record<string, any> = {
    'customers': IndividualCustomerDetailSchema,
    'inquiry': InquirySchema,
    'properties': PropertySchema,
    'report': AiReportSchema,
    'batchReportSettings': BatchReportSettingSchema,
  };
  
  return schemaMap[tableName];
};

// 全テーブルのキー構造をエクスポート
export const tableKeyStructures = Object.values(DynamoDBSchemas).reduce((acc, schema) => {
  acc[schema.tableName] = {
    hashKey: schema.keys.partitionKey,
    rangeKey: schema.keys.sortKey,
  };
  return acc;
}, {} as Record<string, { hashKey: string; rangeKey: string }>); 