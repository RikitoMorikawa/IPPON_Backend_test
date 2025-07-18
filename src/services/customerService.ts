import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { getCustomerDetails, deleteCustomerDetails } from '@src/repositroies/customerModel';
import { uploadFileToS3, S3BucketType } from '@src/services/s3Service';
import { CustomFastifyInstance } from '@src/interfaces/CustomFastifyInstance';
import { FastifyRequest } from 'fastify';
import { v4 as uuidv4 } from 'uuid';
import { CustomerDetail, IndividualCustomerDetail, CorporateCustomerDetail } from '@src/models/customerType';
import { CustomerType, CUSTOMER_TYPES } from '@src/enums/customerEnums';
import { 
  CustomerFormData, 
  IndividualCustomerFormData, 
  CorporateCustomerFormData,
  CreateCustomerRequest,
  UpdateCustomerRequest
} from '@src/interfaces/customerInterfaces';

// ============================================
// 画像処理関連のユーティリティ
// ============================================

export const detectMimeType = (buffer: Buffer): string => {
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    return 'image/png';
  }

  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }

  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return 'image/webp';
  }

  if (buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) {
    return 'application/pdf';
  }

  return 'image/jpeg';
};

export const parseArrayData = (value: string | string[]): string[] => {
  if (Array.isArray(value)) {
    return value;
  }

  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    if (typeof parsed === 'string') {
      return [parsed];
    }
  } catch (e) {
    return [value];
  }

  throw new Error('Invalid data format. Expected an array or string.');
};

export const processBase64Image = async (
  imageData: string,
  folderName: string,
  clientId: string,
  bucketType: S3BucketType = 'client', // デフォルトは顧客用バケット
): Promise<string> => {
  try {
    if (imageData.startsWith('http')) {
      return imageData;
    }

    const base64String = imageData.includes('base64,') ? imageData.split('base64,')[1] : imageData;

    let mimeTypeFromData = '';
    if (imageData.includes('data:') && imageData.includes(';base64,')) {
      mimeTypeFromData = imageData.split(';')[0].split(':')[1];
    }

    const buffer = Buffer.from(base64String, 'base64');

    if (buffer.length === 0) {
      throw new Error('Empty file received');
    }

    const contentType = mimeTypeFromData || detectMimeType(buffer);

    let extension = 'jpeg';

    if (contentType.includes('png')) {
      extension = 'png';
    } else if (contentType.includes('webp')) {
      extension = 'webp';
    } else if (contentType.includes('pdf')) {
      extension = 'pdf';
    }

    const uniqueFilename = `${Date.now()}-${Math.random().toString(36).substring(7)}.${extension}`;
    const s3Key = `${folderName}/${clientId}/${uniqueFilename}`;

    const s3Url = await uploadFileToS3(buffer, s3Key, contentType, bucketType);

    return s3Url;
  } catch (error) {
    console.error('Error processing image data:', error);
    throw new Error(`Failed to process image: ${(error as Error).message}`);
  }
};

export function isValidUrl(url: unknown): boolean {
  return Boolean(url) && typeof url === 'string' && !url.endsWith('-');
}

export function verifyDdbClient(app: CustomFastifyInstance): any {
  const ddbDocClient = app.ddbDocClient;
  if (!ddbDocClient) {
    throw new Error('DynamoDB Client is not initialized');
  }
  return ddbDocClient;
}

export const generateCustomerRegistrationNumber = (): number => {
  const min = 0;
  const max = 9999999;
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

// ============================================
// 顧客タイプ判定・処理関連
// ============================================

export const isIndividualCustomer = (customerType: CustomerType): boolean => {
  return customerType === CUSTOMER_TYPES.INDIVIDUAL_CUSTOMER;
};

export const isCorporateCustomer = (customerType: CustomerType): boolean => {
  return customerType === CUSTOMER_TYPES.CORPORATE_CUSTOMER;
};

export const validateCustomerType = (customerType: string): CustomerType => {
  if (!Object.values(CUSTOMER_TYPES).includes(customerType as CustomerType)) {
    throw new Error(`Invalid customer type: ${customerType}`);
  }
  return customerType as CustomerType;
};

// ============================================
// 新しい顧客作成関連
// ============================================

export const buildCustomerDetailFromFormData = (
  formData: Record<string, any>,
  clientId: string,
  employeeId: string,
  idCardFrontUrls: string[],
  idCardBackUrls: string[],
  representativeIdCardFrontUrls: string[],
  representativeIdCardBackUrls: string[],
  managerIdCardFrontUrls: string[],
  managerIdCardBackUrls: string[],
): CustomerDetail => {
  const timestamp = new Date().toISOString();
  const customerId = uuidv4();

  // 顧客タイプの検証
  const customerType = validateCustomerType(formData.customer_type);

  const customerDetail: CustomerDetail = {
    id: customerId,
    client_id: clientId,
    employee_id: formData.employee_id || employeeId,
    customer_type: customerType,
    property_ids: formData.property_ids || [],
    created_at: timestamp,
    updated_at: timestamp,
  };

  // 個人顧客の場合
  if (isIndividualCustomer(customerType)) {
    customerDetail.individual_customer_details = {
      first_name: formData.first_name || '',
      last_name: formData.last_name || '',
      middle_name: formData.middle_name || '',
      first_name_kana: formData.first_name_kana || '',
      last_name_kana: formData.last_name_kana || '',
      middle_name_kana: formData.middle_name_kana || '',
      birthday: formData.birthday || '',
      gender: formData.gender || '',
      mail_address: formData.mail_address || '',
      phone_number: formData.phone_number || '',
      postcode: formData.postcode || '',
      prefecture: formData.prefecture,
      city: formData.city || '',
      street_address: formData.street_address || '',
      building: formData.building || '',
      room_number: formData.room_number || '',
      id_card_front_path: idCardFrontUrls.length > 0 ? idCardFrontUrls[0] : '',
      id_card_back_path: idCardBackUrls.length > 0 ? idCardBackUrls[0] : '',
    };
  } 
  // 法人顧客の場合
  else if (isCorporateCustomer(customerType)) {
    customerDetail.corporate_customer_details = {
      // 会社基本情報（必須フィールド）
      corporate_name: formData.corporate_name || '',
      corporate_name_kana: formData.corporate_name_kana || '',
      head_office_postcode: formData.head_office_postcode || '',
      head_office_prefecture: formData.head_office_prefecture,
      head_office_city: formData.head_office_city || '',
      head_office_street_address: formData.head_office_street_address || '',
      head_office_building: formData.head_office_building,
      head_office_phone_number: formData.head_office_phone_number,
      head_office_fax_number: formData.head_office_fax_number,
      business_type: formData.business_type,
      state_of_listing: formData.state_of_listing,
      capital_fund: formData.capital_fund,
      annual_turnover: formData.annual_turnover,
      primary_bank: formData.primary_bank,
      employees_count: formData.employees_count,
      establishment_date: formData.establishment_date,

      // 代表者情報（必須フィールド）
      representative_last_name: formData.representative_last_name || '',
      representative_first_name: formData.representative_first_name || '',
      representative_last_name_kana: formData.representative_last_name_kana || '',
      representative_first_name_kana: formData.representative_first_name_kana || '',
      representative_mobile_number: formData.representative_mobile_number || '',
      representative_postcode: formData.representative_postcode || '',
      representative_prefecture: formData.representative_prefecture,
      representative_city: formData.representative_city || '',
      representative_street_address: formData.representative_street_address || '',
      representative_building: formData.representative_building,
      representative_id_card_front_path: representativeIdCardFrontUrls.length > 0 ? representativeIdCardFrontUrls[0] : '',
      representative_id_card_back_path: representativeIdCardBackUrls.length > 0 ? representativeIdCardBackUrls[0] : '',

      // 担当者情報（必須フィールド）
      manager_last_name: formData.manager_last_name || '',
      manager_first_name: formData.manager_first_name || '',
      manager_last_name_kana: formData.manager_last_name_kana || '',
      manager_first_name_kana: formData.manager_first_name_kana || '',
      manager_phone_number: formData.manager_phone_number || '',
      manager_fax_number: formData.manager_fax_number,
      manager_email_address: formData.manager_email_address,
      manager_department: formData.manager_department,
      manager_position: formData.manager_position,
      manager_id_card_front_path: managerIdCardFrontUrls.length > 0 ? managerIdCardFrontUrls[0] : '',
      manager_id_card_back_path: managerIdCardBackUrls.length > 0 ? managerIdCardBackUrls[0] : '',
      manager_postcode: formData.manager_postcode || '',
      manager_prefecture: formData.manager_prefecture,
      manager_city: formData.manager_city || '',
      manager_street_address: formData.manager_street_address,
      manager_building: formData.manager_building,

      // 連帯保証人情報（全てオプション）
      guarantor_last_name: formData.guarantor_last_name,
      guarantor_first_name: formData.guarantor_first_name,
      guarantor_last_name_kana: formData.guarantor_last_name_kana,
      guarantor_first_name_kana: formData.guarantor_first_name_kana,
      guarantor_gender: formData.guarantor_gender,
      guarantor_nationality: formData.guarantor_nationality,
      guarantor_birthday: formData.guarantor_birthday,
      guarantor_age: formData.guarantor_age,
      guarantor_relationship: formData.guarantor_relationship,
      guarantor_mobile_phone_number: formData.guarantor_mobile_phone_number,
      guarantor_home_phone_number: formData.guarantor_home_phone_number,
      guarantor_email_address: formData.guarantor_email_address,
      guarantor_postal_code: formData.guarantor_postal_code,
      guarantor_prefecture: formData.guarantor_prefecture,
      guarantor_city: formData.guarantor_city,
      guarantor_street_address: formData.guarantor_street_address,
      guarantor_building: formData.guarantor_building,
      guarantor_residence_type: formData.guarantor_residence_type,
      guarantor_work_school_name: formData.guarantor_work_school_name,
      guarantor_work_school_name_kana: formData.guarantor_work_school_name_kana,
      guarantor_work_phone_number: formData.guarantor_work_phone_number,
      guarantor_work_address: formData.guarantor_work_address,
      guarantor_department: formData.guarantor_department,
      guarantor_position: formData.guarantor_position,
      guarantor_industry: formData.guarantor_industry,
      guarantor_capital: formData.guarantor_capital,
      guarantor_employee_count: formData.guarantor_employee_count,
      guarantor_establishment_date: formData.guarantor_establishment_date,
      guarantor_service_years: formData.guarantor_service_years,
      guarantor_service_months: formData.guarantor_service_months,
      guarantor_annual_income_gross: formData.guarantor_annual_income_gross,

      // 提出書類（全てオプション）
      company_registration: formData.company_registration,
      supplementary_doc_1: formData.supplementary_doc_1,
      supplementary_doc_2: formData.supplementary_doc_2,

      // 決算書（全てオプション）
      previous_pl_statement: formData.previous_pl_statement,
      previous_balance_sheet: formData.previous_balance_sheet,
      two_years_ago_pl_statement: formData.two_years_ago_pl_statement,
      two_years_ago_balance_sheet: formData.two_years_ago_balance_sheet,
      three_years_ago_pl_statement: formData.three_years_ago_pl_statement,
      three_years_ago_balance_sheet: formData.three_years_ago_balance_sheet,
    };
  }

  return customerDetail;
};

export const createNewCustomerDetail = (data: CreateCustomerRequest & { client_id: string }): CustomerDetail => {
  const timestamp = new Date().toISOString();
  const customerId = uuidv4();

  const customerDetail: CustomerDetail = {
    id: customerId,
    client_id: data.client_id,
    employee_id: data.employee_id,
    customer_type: data.customer_type,
    property_ids: data.property_ids || [],
    created_at: timestamp,
    updated_at: timestamp,
  };

  // 個人顧客の場合
  if (isIndividualCustomer(data.customer_type) && data.individual_customer_details) {
    customerDetail.individual_customer_details = data.individual_customer_details;
  }

  // 法人顧客の場合
  if (isCorporateCustomer(data.customer_type) && data.corporate_customer_details) {
    customerDetail.corporate_customer_details = data.corporate_customer_details;
  }

  return customerDetail;
};

// ============================================
// 画像処理関連（個人顧客用）
// ============================================

export async function processIndividualIdCardImages(
  value: string,
  formData: Record<string, any>,
  urlsArray: string[],
  fieldType: string,
): Promise<void> {
  try {
    // Handle empty string case - user wants to clear the field
    if (value === "" || value.trim() === "") {
      console.log(`Empty string provided for ${fieldType} - field will be cleared`);
      return;
    }

    const base64Array = parseArrayData(value);
    const clientId = formData.client_id;

    for (const base64Data of base64Array) {
      if (!base64Data || typeof base64Data !== 'string') {
        console.warn(`Skipping invalid base64 data in ${fieldType}`);
        continue;
      }

      const s3Url = await processBase64Image(
        base64Data,
        'individual_customer_register_files',
        clientId,
        'client',
      );
      urlsArray.push(s3Url);
    }
  } catch (error) {
    console.error(`Error processing ${fieldType}:`, error);
    throw new Error(`Error processing ${fieldType}: ${(error as Error).message}`);
  }
}

// ============================================
// 画像処理関連（法人顧客用）
// ============================================

export async function processCorporateIdCardImages(
  value: string,
  formData: Record<string, any>,
  urlsArray: string[],
  fieldType: string,
): Promise<void> {
  try {
    // Handle empty string case - user wants to clear the field
    if (value === "" || value.trim() === "") {
      console.log(`Empty string provided for ${fieldType} - field will be cleared`);
      return;
    }

    const base64Array = parseArrayData(value);
    const clientId = formData.client_id;

    for (const base64Data of base64Array) {
      if (!base64Data || typeof base64Data !== 'string') {
        console.warn(`Skipping invalid base64 data in ${fieldType}`);
        continue;
      }

      const s3Url = await processBase64Image(
        base64Data,
        'corporate_customer_register_files',
        clientId,
      );
      urlsArray.push(s3Url);
    }
  } catch (error) {
    console.error(`Error processing ${fieldType}:`, error);
    throw new Error(`Error processing ${fieldType}: ${(error as Error).message}`);
  }
}

// ============================================
// JSONフィールド処理
// ============================================

export function processJsonField(
  fieldName: string,
  value: string,
  formData: Record<string, any>,
): void {
  try {
    const parsedValue = JSON.parse(value);

    if (!Array.isArray(parsedValue)) {
      throw new Error(`${fieldName} field must contain an array`);
    }

    formData[fieldName] = parsedValue;
  } catch (error) {
    throw new Error(`Invalid JSON format for ${fieldName}`);
  }
}

// ============================================
// 個人顧客フォームデータ処理
// ============================================

export async function processIndividualCustomerFormField(
  fieldName: string,
  value: string,
  formData: Record<string, any>,
  idCardFrontUrls: string[],
  idCardBackUrls: string[],
): Promise<void> {
  if (fieldName === 'id_card_front') {
    formData[fieldName] = value;
    await processIndividualIdCardImages(value, formData, idCardFrontUrls, 'id_card_front');
  } else if (fieldName === 'id_card_back') {
    formData[fieldName] = value;
    await processIndividualIdCardImages(value, formData, idCardBackUrls, 'id_card_back');
  } else if (['property_ids', 'linked_doc', 'linked_prop'].includes(fieldName)) {
    processJsonField(fieldName, value, formData);
  } else {
    formData[fieldName] = value;
  }
}

// ============================================
// 法人顧客フォームデータ処理
// ============================================

export async function processCorporateCustomerFormField(
  fieldName: string,
  value: string,
  formData: Record<string, any>,
  representativeIdCardFrontUrls: string[],
  representativeIdCardBackUrls: string[],
  managerIdCardFrontUrls: string[],
  managerIdCardBackUrls: string[],
): Promise<void> {
  if (fieldName === 'representative_id_card_front') {
    formData[fieldName] = value;
    await processCorporateIdCardImages(value, formData, representativeIdCardFrontUrls, 'representative_id_card_front');
  } else if (fieldName === 'representative_id_card_back') {
    formData[fieldName] = value;
    await processCorporateIdCardImages(value, formData, representativeIdCardBackUrls, 'representative_id_card_back');
  } else if (fieldName === 'manager_id_card_front') {
    formData[fieldName] = value;
    await processCorporateIdCardImages(value, formData, managerIdCardFrontUrls, 'manager_id_card_front');
  } else if (fieldName === 'manager_id_card_back') {
    formData[fieldName] = value;
    await processCorporateIdCardImages(value, formData, managerIdCardBackUrls, 'manager_id_card_back');
  } else if (['property_ids', 'linked_doc', 'linked_prop'].includes(fieldName)) {
    processJsonField(fieldName, value, formData);
  } else {
    formData[fieldName] = value;
  }
}

// ============================================
// 統合フォームデータ処理
// ============================================

export async function processCustomerFormData(req: FastifyRequest, clientId?: string): Promise<{
  formData: Record<string, any>;
  idCardFrontUrls: string[];
  idCardBackUrls: string[];
  representativeIdCardFrontUrls: string[];
  representativeIdCardBackUrls: string[];
  managerIdCardFrontUrls: string[];
  managerIdCardBackUrls: string[];
}> {
  const formData: Record<string, any> = {};
  const idCardFrontUrls: string[] = [];
  const idCardBackUrls: string[] = [];
  const representativeIdCardFrontUrls: string[] = [];
  const representativeIdCardBackUrls: string[] = [];
  const managerIdCardFrontUrls: string[] = [];
  const managerIdCardBackUrls: string[] = [];

  // clientIdがある場合はformDataに設定
  if (clientId) {
    formData.client_id = clientId;
  }

  const parts = req.parts();

  for await (const part of parts) {
    if (part.type === 'field') {
      const fieldName = part.fieldname;
      const value = part.value as string;

      // 顧客タイプに応じた処理
      if (!formData.customer_type) {
        formData.customer_type = value;
      }

      const customerType = formData.customer_type as CustomerType;

      if (isIndividualCustomer(customerType)) {
        await processIndividualCustomerFormField(
          fieldName,
          value,
          formData,
          idCardFrontUrls,
          idCardBackUrls,
        );
      } else if (isCorporateCustomer(customerType)) {
        await processCorporateCustomerFormField(
          fieldName,
          value,
          formData,
          representativeIdCardFrontUrls,
          representativeIdCardBackUrls,
          managerIdCardFrontUrls,
          managerIdCardBackUrls,
        );
      } else {
        // 顧客タイプが不明な場合は通常の処理
        formData[fieldName] = value;
      }
    }
  }

  return { 
    formData, 
    idCardFrontUrls, 
    idCardBackUrls,
    representativeIdCardFrontUrls,
    representativeIdCardBackUrls,
    managerIdCardFrontUrls,
    managerIdCardBackUrls,
  };
}

// ============================================
// 顧客更新データ準備
// ============================================

export function prepareIndividualCustomerUpdates(
  customerData: Record<string, any>,
  idCardFrontUrls: string[],
  idCardBackUrls: string[],
): Partial<IndividualCustomerDetail> {
  const updates: Partial<IndividualCustomerDetail> = {};

  // 個人顧客の有効なフィールドのみ含める
  const validIndividualFields = new Set([
    'first_name',
    'last_name',
    'middle_name',
    'first_name_kana',
    'last_name_kana',
    'middle_name_kana',
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
    'id_card_front_path',
    'id_card_back_path',
  ]);

  Object.keys(customerData).forEach((key) => {
    if (validIndividualFields.has(key)) {
      updates[key as keyof IndividualCustomerDetail] = customerData[key];
    }
  });

  // 身分証明書の処理
  if (customerData._clear_id_card_front) {
    updates.id_card_front_path = '';
  } else if (idCardFrontUrls && idCardFrontUrls.length > 0) {
    updates.id_card_front_path = idCardFrontUrls[0];
  }

  if (customerData._clear_id_card_back) {
    updates.id_card_back_path = '';
  } else if (idCardBackUrls && idCardBackUrls.length > 0) {
    updates.id_card_back_path = idCardBackUrls[0];
  }

  return updates;
}

export function prepareCorporateCustomerUpdates(
  customerData: Record<string, any>,
  representativeIdCardFrontUrls: string[],
  representativeIdCardBackUrls: string[],
  managerIdCardFrontUrls: string[],
  managerIdCardBackUrls: string[],
): Partial<CorporateCustomerDetail> {
  const updates: Partial<CorporateCustomerDetail> = {};

  // 法人顧客の有効なフィールドのみ含める
  const validCorporateFields = new Set([
    // 会社基本情報
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
    
    // 会社代表者情報
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
    'representative_id_card_front_path',
    'representative_id_card_back_path',
    
    // 担当者情報
    'manager_last_name',
    'manager_first_name',
    'manager_last_name_kana',
    'manager_first_name_kana',
    'manager_phone_number',
    'manager_fax_number',
    'manager_email_address',
    'manager_department',
    'manager_position',
    'manager_id_card_front_path',
    'manager_id_card_back_path',
    'manager_postcode',
    'manager_prefecture',
    'manager_city',
    'manager_street_address',
    'manager_building',
    
    // 連帯保証人情報
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
    
    // 提出書類
    'company_registration',
    'supplementary_doc_1',
    'supplementary_doc_2',
    
    // 決算書
    'previous_pl_statement',
    'previous_balance_sheet',
    'two_years_ago_pl_statement',
    'two_years_ago_balance_sheet',
    'three_years_ago_pl_statement',
    'three_years_ago_balance_sheet',
  ]);

  Object.keys(customerData).forEach((key) => {
    if (validCorporateFields.has(key)) {
      updates[key as keyof CorporateCustomerDetail] = customerData[key];
    }
  });

  // 代表者の身分証明書の処理
  if (customerData._clear_representative_id_card_front) {
    updates.representative_id_card_front_path = '';
  } else if (representativeIdCardFrontUrls && representativeIdCardFrontUrls.length > 0) {
    updates.representative_id_card_front_path = representativeIdCardFrontUrls[0];
  }

  if (customerData._clear_representative_id_card_back) {
    updates.representative_id_card_back_path = '';
  } else if (representativeIdCardBackUrls && representativeIdCardBackUrls.length > 0) {
    updates.representative_id_card_back_path = representativeIdCardBackUrls[0];
  }

  // 担当者の身分証明書の処理
  if (customerData._clear_manager_id_card_front) {
    updates.manager_id_card_front_path = '';
  } else if (managerIdCardFrontUrls && managerIdCardFrontUrls.length > 0) {
    updates.manager_id_card_front_path = managerIdCardFrontUrls[0];
  }

  if (customerData._clear_manager_id_card_back) {
    updates.manager_id_card_back_path = '';
  } else if (managerIdCardBackUrls && managerIdCardBackUrls.length > 0) {
    updates.manager_id_card_back_path = managerIdCardBackUrls[0];
  }

  return updates;
}

// ============================================
// 統合顧客更新データ準備
// ============================================

export function prepareCustomerDetailUpdates(
  customerData: Record<string, any>,
  idCardFrontUrls: string[],
  idCardBackUrls: string[],
  representativeIdCardFrontUrls: string[],
  representativeIdCardBackUrls: string[],
  managerIdCardFrontUrls: string[],
  managerIdCardBackUrls: string[],
): Partial<CustomerDetail> {
  const updates: Partial<CustomerDetail> = {};
  const timestamp = new Date().toISOString();

  // 基本フィールドの更新
  if (customerData.employee_id) {
    updates.employee_id = customerData.employee_id;
  }
  if (customerData.property_ids) {
    updates.property_ids = customerData.property_ids;
  }

  updates.updated_at = timestamp;

  let customerType: CustomerType | null = null;
  
  if (customerData.customer_type && 
      (customerData.customer_type === 'individual_customer' || customerData.customer_type === 'corporate_customer')) {
    customerType = validateCustomerType(customerData.customer_type);
  } else {
    if (customerData.corporate_name || customerData.representative_last_name || customerData.manager_last_name) {
      customerType = CUSTOMER_TYPES.CORPORATE_CUSTOMER;
    } else if (customerData.first_name || customerData.last_name) {
      customerType = CUSTOMER_TYPES.INDIVIDUAL_CUSTOMER;
    }
  }

  if (customerType) {
    if (isIndividualCustomer(customerType)) {
      const individualUpdates = prepareIndividualCustomerUpdates(
        customerData,
        idCardFrontUrls,
        idCardBackUrls,
      );
      updates.individual_customer_details = individualUpdates as IndividualCustomerDetail;
    } else if (isCorporateCustomer(customerType)) {
      const corporateUpdates = prepareCorporateCustomerUpdates(
        customerData,
        representativeIdCardFrontUrls,
        representativeIdCardBackUrls,
        managerIdCardFrontUrls,
        managerIdCardBackUrls,
      );
      updates.corporate_customer_details = corporateUpdates as CorporateCustomerDetail;
    }
  }

  return updates;
}

export async function processMemberCardImages(
  base64Data: string,
  formData: Record<string, any>,
): Promise<string> {
  try {
    // Check if base64 string is valid
    if (!base64Data || typeof base64Data !== 'string') {
      console.warn(`Skipping invalid base64 data for image_url`);
      return '';
    }

    const clientId = formData.client_id || 'temp-client-id';

    // Process the single base64 string
    const s3Url = await processBase64Image(base64Data, 'member_image', clientId);

    // Set the URL directly in formData
    formData.image_url = s3Url;
    return s3Url;
  } catch (error) {
    console.error(`Error processing image_url:`, error);
    throw new Error(`Error processing image_url: ${(error as Error).message}`);
  }
}

// ============================================
// 顧客レスポンス形式変換
// ============================================

/**
 * 顧客データを統一されたレスポンス形式に変換
 * ダッシュボード、問い合わせ、その他のAPIで共通使用
 */
export const formatCustomerResponse = (customer: CustomerDetail) => {
  const baseInfo = {
    id: customer.id,
    client_id: customer.client_id,
    employee_id: customer.employee_id || '',
    customer_type: customer.customer_type,
    created_at: customer.created_at,
    updated_at: customer.updated_at || '',
    deleted_at: customer.deleted_at || '',
  };

  if (customer.customer_type === CUSTOMER_TYPES.INDIVIDUAL_CUSTOMER && customer.individual_customer_details) {
    const details = customer.individual_customer_details;
    return {
      ...baseInfo,
      individual_customer: {
        first_name: details.first_name || '',
        last_name: details.last_name || '',
        middle_name: details.middle_name || '',
        first_name_kana: details.first_name_kana || '',
        last_name_kana: details.last_name_kana || '',
        middle_name_kana: details.middle_name_kana || '',
        birthday: details.birthday || '',
        gender: details.gender || '',
        mail_address: details.mail_address || '',
        phone_number: details.phone_number || '',
        postcode: details.postcode || '',
        prefecture: details.prefecture || '',
        city: details.city || '',
        street_address: details.street_address || '',
        building: details.building || '',
        room_number: details.room_number || '',
        id_card_front_path: details.id_card_front_path || '',
        id_card_back_path: details.id_card_back_path || '',
      },
    };
  } else if (customer.customer_type === CUSTOMER_TYPES.CORPORATE_CUSTOMER && customer.corporate_customer_details) {
    const details = customer.corporate_customer_details;
    return {
      ...baseInfo,
      corporate_customer: {
        // 会社基本情報
        corporate_name: details.corporate_name || '',
        corporate_name_kana: details.corporate_name_kana || '',
        head_office_postcode: details.head_office_postcode || '',
        head_office_prefecture: details.head_office_prefecture || '',
        head_office_city: details.head_office_city || '',
        head_office_street_address: details.head_office_street_address || '',
        head_office_building: details.head_office_building || '',
        head_office_phone_number: details.head_office_phone_number || '',
        head_office_fax_number: details.head_office_fax_number || '',
        business_type: details.business_type || '',
        state_of_listing: details.state_of_listing || '',
        capital_fund: details.capital_fund || '',
        annual_turnover: details.annual_turnover || '',
        primary_bank: details.primary_bank || '',
        employees_count: details.employees_count || '',
        establishment_date: details.establishment_date || '',
        
        // 代表者情報
        representative_first_name: details.representative_first_name || '',
        representative_last_name: details.representative_last_name || '',
        representative_first_name_kana: details.representative_first_name_kana || '',
        representative_last_name_kana: details.representative_last_name_kana || '',
        representative_mobile_number: details.representative_mobile_number || '',
        representative_postcode: details.representative_postcode || '',
        representative_prefecture: details.representative_prefecture || '',
        representative_city: details.representative_city || '',
        representative_street_address: details.representative_street_address || '',
        representative_building: details.representative_building || '',
        representative_id_card_front_path: details.representative_id_card_front_path || '',
        representative_id_card_back_path: details.representative_id_card_back_path || '',
        
        // 担当者情報
        manager_first_name: details.manager_first_name || '',
        manager_last_name: details.manager_last_name || '',
        manager_first_name_kana: details.manager_first_name_kana || '',
        manager_last_name_kana: details.manager_last_name_kana || '',
        manager_phone_number: details.manager_phone_number || '',
        manager_fax_number: details.manager_fax_number || '',
        manager_email_address: details.manager_email_address || '',
        manager_department: details.manager_department || '',
        manager_position: details.manager_position || '',
        manager_id_card_front_path: details.manager_id_card_front_path || '',
        manager_id_card_back_path: details.manager_id_card_back_path || '',
        manager_postcode: details.manager_postcode || '',
        manager_prefecture: details.manager_prefecture || '',
        manager_city: details.manager_city || '',
        manager_street_address: details.manager_street_address || '',
        manager_building: details.manager_building || '',
        
        // 連帯保証人情報（全て任意）
        guarantor_last_name: details.guarantor_last_name || '',
        guarantor_first_name: details.guarantor_first_name || '',
        guarantor_last_name_kana: details.guarantor_last_name_kana || '',
        guarantor_first_name_kana: details.guarantor_first_name_kana || '',
        guarantor_gender: details.guarantor_gender || '',
        guarantor_nationality: details.guarantor_nationality || '',
        guarantor_birthday: details.guarantor_birthday || '',
        guarantor_age: details.guarantor_age || '',
        guarantor_relationship: details.guarantor_relationship || '',
        guarantor_mobile_phone_number: details.guarantor_mobile_phone_number || '',
        guarantor_home_phone_number: details.guarantor_home_phone_number || '',
        guarantor_email_address: details.guarantor_email_address || '',
        guarantor_postal_code: details.guarantor_postal_code || '',
        guarantor_prefecture: details.guarantor_prefecture || '',
        guarantor_city: details.guarantor_city || '',
        guarantor_street_address: details.guarantor_street_address || '',
        guarantor_building: details.guarantor_building || '',
        guarantor_residence_type: details.guarantor_residence_type || '',
        guarantor_work_school_name: details.guarantor_work_school_name || '',
        guarantor_work_school_name_kana: details.guarantor_work_school_name_kana || '',
        guarantor_work_phone_number: details.guarantor_work_phone_number || '',
        guarantor_work_address: details.guarantor_work_address || '',
        guarantor_department: details.guarantor_department || '',
        guarantor_position: details.guarantor_position || '',
        guarantor_industry: details.guarantor_industry || '',
        guarantor_capital: details.guarantor_capital || '',
        guarantor_employee_count: details.guarantor_employee_count || '',
        guarantor_establishment_date: details.guarantor_establishment_date || '',
        guarantor_service_years: details.guarantor_service_years || '',
        guarantor_service_months: details.guarantor_service_months || '',
        guarantor_annual_income_gross: details.guarantor_annual_income_gross || '',
        
        // 提出書類（全て任意）
        company_registration: details.company_registration || [],
        supplementary_doc_1: details.supplementary_doc_1 || [],
        supplementary_doc_2: details.supplementary_doc_2 || [],
        
        // 決算書（全て任意）
        previous_pl_statement: details.previous_pl_statement || [],
        previous_balance_sheet: details.previous_balance_sheet || [],
        two_years_ago_pl_statement: details.two_years_ago_pl_statement || [],
        two_years_ago_balance_sheet: details.two_years_ago_balance_sheet || [],
        three_years_ago_pl_statement: details.three_years_ago_pl_statement || [],
        three_years_ago_balance_sheet: details.three_years_ago_balance_sheet || [],
      },
    };
  }
  
  // デフォルトの空の顧客情報
  return {
    ...baseInfo,
    customer_type: customer.customer_type,
  };
};
