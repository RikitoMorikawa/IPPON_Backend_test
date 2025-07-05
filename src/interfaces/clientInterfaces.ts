export interface Client {
    id: string;
    register_timestamp: Date;
    update_timestamp: Date;
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
    s3_path: string;
    transaction_ledger_option: boolean;
}

export interface CreateClientRequestBody {
    client_name: string;
    client_name_kana: string;
    client_tell?: string;
    client_mail_address: string;
    hp_address?: string;
    postcode?: string;
    prefecture?: string;
    city?: string;
    steet_address?: string;
    building?: string;
    s3_path?: string;
    transaction_ledger_option?: boolean;
}

export interface UpdateClientRequestBody {
    client_id: string;
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
    s3_path?: string;
}

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


