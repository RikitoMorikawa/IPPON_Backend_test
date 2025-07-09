/**
 * Inquiry（問い合わせ）テーブル用のEnum定数
 */

// 問い合わせタイトル
export const INQUIRY_TITLES = {
  NEW_INQUIRY: '新規問い合わせ',
} as const;

// 問い合わせカテゴリ
export const INQUIRY_CATEGORIES = {
  NEW_INQUIRY: '問い合わせ（新規）',
  GENERAL_INQUIRY: 'お問い合わせ',
  BUSINESS_MEETING: '商談',
  VIEWING: '内見',
} as const;

// 問い合わせタイプ
export const INQUIRY_TYPES = {
  AVAILABILITY_CHECK: '空き状況の確認',
  RENT_PRICE_INQUIRY: '賃料・価格について',
  VIEWING_REQUEST: '内見希望',
  PROPERTY_DETAILS: '物件の詳細情報',
} as const;

// 問い合わせ方法
export const INQUIRY_METHODS = {
  SUUMO: 'SUUMO',
  PHONE: '電話',
  OTHER: 'その他',
} as const;

// TypeScript型定義
export type InquiryTitle = typeof INQUIRY_TITLES[keyof typeof INQUIRY_TITLES];
export type InquiryCategory = typeof INQUIRY_CATEGORIES[keyof typeof INQUIRY_CATEGORIES];
export type InquiryType = typeof INQUIRY_TYPES[keyof typeof INQUIRY_TYPES];
export type InquiryMethod = typeof INQUIRY_METHODS[keyof typeof INQUIRY_METHODS];

// 配列として取得するヘルパー関数
export const getInquiryTitles = (): string[] => Object.values(INQUIRY_TITLES);
export const getInquiryCategories = (): string[] => Object.values(INQUIRY_CATEGORIES);
export const getInquiryTypes = (): string[] => Object.values(INQUIRY_TYPES);
export const getInquiryMethods = (): string[] => Object.values(INQUIRY_METHODS);

// バリデーション用関数
export const isValidInquiryTitle = (value: string): value is InquiryTitle => {
  return Object.values(INQUIRY_TITLES).includes(value as InquiryTitle);
};

export const isValidInquiryCategory = (value: string): value is InquiryCategory => {
  return Object.values(INQUIRY_CATEGORIES).includes(value as InquiryCategory);
};

export const isValidInquiryType = (value: string): value is InquiryType => {
  return Object.values(INQUIRY_TYPES).includes(value as InquiryType);
};

export const isValidInquiryMethod = (value: string): value is InquiryMethod => {
  return Object.values(INQUIRY_METHODS).includes(value as InquiryMethod);
}; 