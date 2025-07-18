import { RouteGenericInterface } from "fastify";
import { errorResponse } from "./errorInterface";

// クライアント
export interface Client {
  id: string;
  register_timestamp: Date;
  update_timestamp: Date | null;
  client_name: string;
  client_name_kana: string;
  client_tell: string;
  client_mail_address: string;
  hp_address: string;
  postcode: string;
  prefecture: string;
  city: string;
  steet_address: string;
  building: string;
  real_estate_number: string | null;
  is_active: boolean | null;
}

// クライアントデータ
export interface ClientData {
  UserId: any,
  client_id: string;
  client_name: string;
  client_tell: string;
  client_mail_address: string;
  hp_address: string;
  register_timestamp: string;
  update_timestamp: string;
  s3_path: string;
  transaction_ledger_option: boolean;
}


// クライアント取得APIのリクエストパラメータのParams
export interface GetClientParams {
  client_id: string;
}

// クライアント取得APIのリクエストパラメータ
export interface GetClientsRequest extends RouteGenericInterface {
  Params: GetClientParams;
}

// クライアント取得APIの正常系レスポンス
export interface GetClientSuccessResponse {
  status: number;
  message: string;
  data: Client;
}


// クライアント取得APIのレスポンス（Union型）
export type GetClientResponse = GetClientSuccessResponse | errorResponse;

// クライアント更新APIのリクエストのパスパラメーター
export interface UpdateClientRequestParams {
  client_id: string;
}


// クライアント更新APIのリクエストのBodyパラメーター
export interface UpdateClientRequestBody {
  client_id?: string;
  client_name?: string;
  client_name_kana?: string;
  transaction_ledger_option: any;
  client_tell?: string;
  client_mail_address?: string;
  hp_address?: string;
  postcode?: string;
  prefecture?: string;
  city?: string;
  steet_address?: string;
  building?: string;
}

// クライアント取得APIのリクエストパラメータ
export interface UpdateClientsRequest extends RouteGenericInterface {
  Params: UpdateClientRequestParams;
  Body: UpdateClientRequestBody;
}


export type  UpdateClientResponse = Client | errorResponse