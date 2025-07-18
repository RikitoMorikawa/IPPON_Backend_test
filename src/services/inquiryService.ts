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
    // 個人顧客フィールド
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
    
    // 法人顧客 - 会社基本情報
    'corporate_name',
    'corporate_name_kana',
    'head_office_postcode',
    'head_office_prefecture',
    'head_office_city',
    'head_office_street_address',
    'head_office_building',
    'head_office_phone_number',
    'head_office_fax_number',
    'business_type',
    'state_of_listing',
    'capital_fund',
    'annual_turnover',
    'primary_bank',
    'employees_count',
    'establishment_date',
    
    // 法人顧客 - 代表者情報
    'representative_last_name',
    'representative_first_name',
    'representative_last_name_kana',
    'representative_first_name_kana',
    'representative_mobile_number',
    'representative_postcode',
    'representative_prefecture',
    'representative_city',
    'representative_street_address',
    'representative_building',
    'representative_id_card_front',
    'representative_id_card_back',
    'representative_id_card_front_path',
    'representative_id_card_back_path',
    
    // 法人顧客 - 担当者情報
    'manager_last_name',
    'manager_first_name',
    'manager_last_name_kana',
    'manager_first_name_kana',
    'manager_phone_number',
    'manager_fax_number',
    'manager_email_address',
    'manager_department',
    'manager_position',
    'manager_id_card_front',
    'manager_id_card_back',
    'manager_id_card_front_path',
    'manager_id_card_back_path',
    'manager_postcode',
    'manager_prefecture',
    'manager_city',
    'manager_street_address',
    'manager_building',
    
    // 法人顧客 - 連帯保証人情報
    'guarantor_last_name',
    'guarantor_first_name',
    'guarantor_last_name_kana',
    'guarantor_first_name_kana',
    'guarantor_gender',
    'guarantor_nationality',
    'guarantor_birthday',
    'guarantor_age',
    'guarantor_relationship',
    'guarantor_mobile_phone_number',
    'guarantor_home_phone_number',
    'guarantor_email_address',
    'guarantor_postal_code',
    'guarantor_prefecture',
    'guarantor_city',
    'guarantor_street_address',
    'guarantor_building',
    'guarantor_residence_type',
    'guarantor_work_school_name',
    'guarantor_work_school_name_kana',
    'guarantor_work_phone_number',
    'guarantor_work_address',
    'guarantor_department',
    'guarantor_position',
    'guarantor_industry',
    'guarantor_capital',
    'guarantor_employee_count',
    'guarantor_establishment_date',
    'guarantor_service_years',
    'guarantor_service_months',
    'guarantor_annual_income_gross',
    
    // 法人顧客 - 提出書類
    'company_registration',
    'supplementary_doc_1',
    'supplementary_doc_2',
    
    // 法人顧客 - 決算書
    'previous_pl_statement',
    'previous_balance_sheet',
    'two_years_ago_pl_statement',
    'two_years_ago_balance_sheet',
    'three_years_ago_pl_statement',
    'three_years_ago_balance_sheet',
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

