/**
 * 共通のAPIレスポンス型定義
 * 既存のApiResponseを拡張して、より詳細な型安全性を提供
 */

import { ApiResponse } from '@src/responses';


export interface PaginationParams {
  page?: number;
  limit?: number;
}

// ページネーション情報の型
export interface PaginationInfo {
  total: number;          // 総件数
  page: number;           // 現在のページ番号
  limit: number;          // 1ページあたりの件数
}

// ページネーション付きレスポンスの型
export interface PaginatedResponse<T> extends PaginationInfo {
  items: T[];             // データ配列
}

// 成功レスポンスの型
export interface SuccessResponse<T = any> extends ApiResponse<T> {
  status: 200 | 201 | 204;
  message: string;
  data: T;
  error?: never;          // 成功時はerrorを持たない
}

// エラーレスポンスの型
export interface ErrorResponse extends ApiResponse {
  status: 400 | 401 | 403 | 404 | 405 | 422 | 500;
  message: string;
  data?: never;           // エラー時はdataを持たない
  error?: string | object;
}

// 統合レスポンス型
export type ApiResponseTyped<T = any> = SuccessResponse<T> | ErrorResponse;

// 単一アイテムレスポンスの型
export interface SingleItemResponse<T> extends SuccessResponse<T> {
  data: T;
}

// リストレスポンスの型（ページネーションなし）
export interface ListResponse<T> extends SuccessResponse<T[]> {
  data: T[];
}

// ページネーション付きリストレスポンスの型
export interface PaginatedListResponse<T> extends SuccessResponse<PaginatedResponse<T>> {
  data: PaginatedResponse<T>;
}

// 作成成功レスポンスの型
export interface CreateResponse<T> extends SuccessResponse<T> {
  status: 201;
  data: T;
}

// 更新成功レスポンスの型
export interface UpdateResponse<T> extends SuccessResponse<T> {
  status: 200;
  data: T;
}

// 削除成功レスポンスの型
export interface DeleteResponse extends SuccessResponse<null> {
  status: 204;
  data: null;
}

// バリデーションエラーの詳細型
export interface ValidationErrorDetail {
  field: string;
  message: string;
  value?: any;
}

// バリデーションエラーレスポンスの型
export interface ValidationErrorResponse extends ErrorResponse {
  status: 422;
  error: {
    validation_errors: ValidationErrorDetail[];
  };
}

// 共通のクエリパラメータ型
export interface BaseQueryParams {
  page?: string;          // ページ番号
  limit?: string;         // 1ページあたりの件数
  sort?: string;          // ソートフィールド
  order?: 'asc' | 'desc'; // ソート順
}

// 日付範囲検索用のクエリパラメータ型
export interface DateRangeQueryParams {
  start_date?: string;    // 開始日 (ISO 8601)
  end_date?: string;      // 終了日 (ISO 8601)
}

// 検索用のクエリパラメータ型
export interface SearchQueryParams {
  search?: string;        // 検索キーワード
  search_fields?: string; // 検索対象フィールド（カンマ区切り）
} 