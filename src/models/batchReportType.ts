/**
 * BatchReportSetting（バッチレポート設定）テーブルの型定義
 * DynamoDBスキーマに基づく完全な型定義
 */

// バッチ実行ステータス
export type BatchStatus = 'active' | 'paused' | 'completed';

// 自動作成期間
export type AutoCreatePeriod = '1週間ごと' | '2週間ごと';

// バッチレポート設定の型
export interface BatchReportSetting {
  // DynamoDB Keys
  id: string;                  // RDB PK (UUID)
  client_id: string;           // PK: クライアントID
  
  // 基本設定
  property_id: string;         // 物件ID
  property_name?: string;      // 物件名（キャッシュ用）
  weekday: number;             // 追加: 0=日曜, 1=月曜, ... 6=土曜
  
  // 期間設定
  start_date: string;          // 開始日 (YYYY-MM-DD)
  auto_create_period: AutoCreatePeriod;  // "1週間ごと" | "2週間ごと"
  
  // 実行設定
  auto_generate: boolean;      // AI自動生成フラグ
  execution_time: string;      // 実行時刻 (HH:mm)
  next_execution_date: string; // 次回実行日時 (ISO 8601)
  
  // ステータス管理
  status: BatchStatus;         // "active" | "paused" | "completed"
  last_execution_date?: string; // 最後実行日時 (ISO 8601)
  execution_count: number;     // 実行回数
  
  // メタデータ
  created_at: string;          // 作成日時 (ISO 8601)
  updated_at: string;          // 更新日時 (ISO 8601)
  deleted_at?: string;         // 削除日時 (ISO 8601)
  employee_id: string;         // 作成した従業員ID
}

// バッチレポート設定作成用のリクエスト型
export interface CreateBatchReportSettingRequest {
  property_id: string;
  weekday: number;             // 追加: 0=日曜, 1=月曜, ... 6=土曜
  start_date: string;
  auto_create_period: AutoCreatePeriod;
  auto_generate: boolean;
  execution_time?: string;     // デフォルト: "01:00"
}

// バッチレポート設定更新用のリクエスト型
export interface UpdateBatchReportSettingRequest {
  property_id?: string;
  weekday?: number;            // 追加: 0=日曜, 1=月曜, ... 6=土曜
  start_date?: string;
  auto_create_period?: AutoCreatePeriod;
  auto_generate?: boolean;
  execution_time?: string;
  status?: BatchStatus;
}

// バッチ実行対象の検索結果型
export interface BatchExecutionTarget {
  id: string;
  client_id: string;
  property_id: string;
  property_name?: string;
  weekday: number;             // 追加: 0=日曜, 1=月曜, ... 6=土曜
  start_date: string;
  auto_create_period: AutoCreatePeriod;
  auto_generate: boolean;
  execution_time: string;      // 実行時刻 (HH:mm)
  next_execution_date: string;
  execution_count: number;
  employee_id: string;
  created_at: string;
} 