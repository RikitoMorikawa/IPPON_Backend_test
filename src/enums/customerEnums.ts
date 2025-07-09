/**
 * Customer（顧客）テーブル用のEnum定数
 */

// 性別
export const GENDERS = {
  MALE: '男性',
  FEMALE: '女性',
  NOT_SET: '設定しない',
} as const;

// TypeScript型定義
export type Gender = typeof GENDERS[keyof typeof GENDERS];

// 配列として取得するヘルパー関数
export const getGenders = (): string[] => Object.values(GENDERS);

// バリデーション用関数
export const isValidGender = (value: string): value is Gender => {
  return Object.values(GENDERS).includes(value as Gender);
};

// 都道府県マッピング（数値コード → 都道府県名）
export const CUSTOMER_PREFECTURE_MAPPING = {
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
  '21': '岐阜県',
  '22': '静岡県',
  '23': '愛知県',
  '24': '三重県',
  '25': '滋賀県',
  '26': '京都府',
  '27': '大阪府',
  '28': '兵庫県',
  '29': '奈良県',
  '30': '和歌山県',
  '31': '鳥取県',
  '32': '島根県',
  '33': '岡山県',
  '34': '広島県',
  '35': '山口県',
  '36': '徳島県',
  '37': '香川県',
  '38': '愛媛県',
  '39': '高知県',
  '40': '福岡県',
  '41': '佐賀県',
  '42': '長崎県',
  '43': '熊本県',
  '44': '大分県',
  '45': '宮崎県',
  '46': '鹿児島県',
  '47': '沖縄県',
} as const;

// TypeScript型定義
export type PrefectureCode = keyof typeof CUSTOMER_PREFECTURE_MAPPING;
export type PrefectureName = typeof CUSTOMER_PREFECTURE_MAPPING[PrefectureCode];

// 都道府県リストを配列として取得
export const getPrefectures = (): string[] => Object.values(CUSTOMER_PREFECTURE_MAPPING);

// 都道府県コードの有効性チェック
export const isValidPrefectureCode = (value: string): value is PrefectureCode => {
  return value in CUSTOMER_PREFECTURE_MAPPING;
};

// 都道府県名の有効性チェック
export const isValidPrefectureName = (value: string): value is PrefectureName => {
  return Object.values(CUSTOMER_PREFECTURE_MAPPING).includes(value as PrefectureName);
};

// 都道府県コードから都道府県名を取得
export const getPrefectureByCode = (code: PrefectureCode): PrefectureName => {
  return CUSTOMER_PREFECTURE_MAPPING[code];
};

// 都道府県名から都道府県コードを取得
export const getPrefectureCodeByName = (name: PrefectureName): PrefectureCode | undefined => {
  return Object.keys(CUSTOMER_PREFECTURE_MAPPING).find(
    key => CUSTOMER_PREFECTURE_MAPPING[key as PrefectureCode] === name
  ) as PrefectureCode | undefined;
}; 