/**
 * Report（報告書）テーブル用のEnum定数
 */

// 保存タイプ
export const SAVE_TYPES = {
  DRAFT: 'draft',
  COMPLETED: 'completed',
} as const;

// レポートステータス
export const REPORT_STATUSES = {
  RECRUITING: '募集中',
  APPLICATION_RECEIVED: '申し込みあり',
  CONTRACT_COMPLETED: '契約済み',
  LISTING_ENDED: '掲載終了',
} as const;


// TypeScript型定義
export type SaveType = typeof SAVE_TYPES[keyof typeof SAVE_TYPES];
export type ReportStatus = typeof REPORT_STATUSES[keyof typeof REPORT_STATUSES];

// 配列として取得するヘルパー関数
export const getSaveTypes = (): string[] => Object.values(SAVE_TYPES);
export const getReportStatuses = (): string[] => Object.values(REPORT_STATUSES);

// バリデーション用関数
export const isValidSaveType = (value: string): value is SaveType => {
  return Object.values(SAVE_TYPES).includes(value as SaveType);
};

export const isValidReportStatus = (value: string): value is ReportStatus => {
  return Object.values(REPORT_STATUSES).includes(value as ReportStatus);
};


 