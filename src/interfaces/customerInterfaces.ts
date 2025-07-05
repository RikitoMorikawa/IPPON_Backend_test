export interface EmployeeUpdateRequest {
  customer_id: string;
  type: string;
  client_id: string;
  pic_id: string;
  register_timestamp: string;
}

export interface Customer {
  id: string; // RDB PK
  client_id: string; // DynamoDB PK
  employee_id: string;
  first_name: string;
  last_name: string;
  middle_name?: string;
  first_name_kana?: string;
  middle_name_kana?: string;
  last_name_kana?: string;
  birthday: string;
  gender?: string;
  mail_address: string;
  phone_number?: string;
  postcode: string;
  prefecture: string;
  city: string;
  street_address: string;
  building: string;
  room_number?: string;
  id_card_front?: string;       // S3 URL for front ID card
  id_card_back?: string;        // S3 URL for back ID card
  id_card_front_path?: string;  // Legacy field for compatibility
  id_card_back_path?: string;   // Legacy field for compatibility
  created_at: string; // DynamoDB SK
  updated_at?: string;
  deleted_at?: string;
}
