export function prepareInquiryUpdates(inquiryData: Record<string, any>): Record<string, any> {
  const updates: Record<string, any> = {};

  // Only include valid inquiry fields
  const validInquiryKeys = new Set([
    'id',
    'property_id',
    'employee_id',
    'type',
    'summary',
    'method',
    'property_name',
    'title',
    'category',
  ]);

  Object.keys(inquiryData).forEach((key) => {
    if (validInquiryKeys.has(key)) {
      updates[key] = inquiryData[key];
    }
  });

  return updates;
}

export function splitPayload(formData: Record<string, any>) {
  const customerKeys = new Set([
    'client_id',
    'customer_created_at',
    'customer_id',
    'employee_id', // 顧客の担当者ID
    'first_name',
    'last_name',
    'middle_name',
    'first_name_kana',
    'middle_name_kana',
    'last_name_kana',
    'birthday',
    'gender',
    'mail_address',
    'phone_number',
    'postcode',
    'prefecture',
    'city',
    'street_address',
    'building',
    'room_number',
    'updated_at',
  ]);

  const inquiryKeys = new Set([
    'id',
    'method',
    'property_id',
    'employee_id', // 問い合わせの担当者ID（同じemployee_idを使用）
    'property_name',
    'type',
    'summary',
    'inquiry_created_at',
    'title',
    'category',
  ]);

  const customerUpdate: Record<string, any> = {};
  const inquiryUpdate: Record<string, any> = {};

  for (const [key, value] of Object.entries(formData)) {
    if (customerKeys.has(key)) {
      customerUpdate[key] = value;
    }
    if (inquiryKeys.has(key)) {
      inquiryUpdate[key] = value;
    }
  }

  return { customerUpdate, inquiryUpdate };
}

