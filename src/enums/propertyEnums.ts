/**
 * Property（物件）テーブル用のEnum定数
 */

// 物件タイプ（日本語）
export const PROPERTY_TYPES = {
  LAND: '土地',
  APARTMENT: 'マンション',
  NEW_HOUSE: '新築',
} as const;

// 都道府県マッピング（数値コード ⇔ 都道府県名）
export const PREFECTURE_MAPPING = {
  '1': '北海道',
  '2': '青森県',
  '3': '岩手県',
  '4': '宮城県',
  '5': '秋田県',
  '6': '山形県',
  '7': '福島県',
  '8': '茨城県',
  '9': '栃木県',
  '10': '群馬県',
  '11': '埼玉県',
  '12': '千葉県',
  '13': '東京都',
  '14': '神奈川県',
  '15': '新潟県',
  '16': '富山県',
  '17': '石川県',
  '18': '福井県',
  '19': '山梨県',
  '20': '長野県',
  '21': '兵庫県',
  '22': '奈良県',
  '23': '和歌山県',
  '24': '鳥取県',
  '25': '島根県',
  '26': '岡山県',
  '27': '広島県',
  '28': '山口県',
  '29': '徳島県',
  '30': '香川県',
  '31': '愛媛県',
  '32': '高知県',
  '33': '福岡県',
  '34': '佐賀県',
  '35': '長崎県',
  '36': '熊本県',
  '37': '大分県',
  '38': '宮崎県',
  '39': '鹿児島県',
  '40': '沖縄県',
  '41': '指定なし',
} as const;


// TypeScript型定義
export type PropertyType = typeof PROPERTY_TYPES[keyof typeof PROPERTY_TYPES];
export type PrefectureCode = keyof typeof PREFECTURE_MAPPING;
export type PrefectureName = typeof PREFECTURE_MAPPING[PrefectureCode];

// 配列として取得するヘルパー関数
export const getPropertyTypes = (): string[] => Object.values(PROPERTY_TYPES);
export const getPrefectures = (): string[] => Object.values(PREFECTURE_MAPPING);

// バリデーション用関数
export const isValidPropertyType = (value: string): value is PropertyType => {
  return Object.values(PROPERTY_TYPES).includes(value as PropertyType);
};

export const isValidPrefectureCode = (value: string): value is PrefectureCode => {
  return value in PREFECTURE_MAPPING;
};

export const isValidPrefectureName = (value: string): value is PrefectureName => {
  return Object.values(PREFECTURE_MAPPING).includes(value as PrefectureName);
};

export const getPrefectureByCode = (code: PrefectureCode): PrefectureName => {
  return PREFECTURE_MAPPING[code];
};

export const getPrefectureCodeByName = (name: PrefectureName): PrefectureCode | undefined => {
  return Object.keys(PREFECTURE_MAPPING).find(
    key => PREFECTURE_MAPPING[key as PrefectureCode] === name
  ) as PrefectureCode | undefined;
}; 