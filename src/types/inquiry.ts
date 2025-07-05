export interface Inquiry {
  id: string; // RDB PK
  client_id: string; // DynamoDB PK
  customer_id: string;
  property_id?: string;
  employee_id?: string;
  inquired_at: string; // DynamoDB SK
  title?: string;
  category?: string;
  type?: string;
  method: string;
  summary?: string;
  created_at: string;
  updated_at?: string;
  deleted_at?: string;
}
