import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { getCustomers, deleteCustomers } from '@src/repositroies/customerModel';
import { uploadFileToS3 } from '@src/services/s3Service';
import { Customer } from '@src/interfaces/customerInterfaces';
import { CustomFastifyInstance } from '@src/interfaces/CustomFastifyInstance';
import { FastifyRequest } from 'fastify';

export const getCustomerService = async (
  ddbDocClient: DynamoDBDocumentClient,
  clientId: string,
  firstName: string,
  lastName: string,
): Promise<Customer[]> => {
  return await getCustomers(ddbDocClient, clientId, firstName, lastName);
};

export const deleteCustomerRecords = async (
  ddbDocClient: DynamoDBDocumentClient,
  ids: string[],
): Promise<void> => {
  await deleteCustomers(ddbDocClient, ids);
};

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

    console.log('Uploading image:', {
      contentType,
      size: buffer.length,
      s3Key,
      extension,
    });

    const s3Url = await uploadFileToS3(buffer, s3Key, contentType);

    return s3Url;
  } catch (error) {
    console.error('Error processing image data:', error);
    throw new Error(`Failed to process image: ${(error as Error).message}`);
  }
};

/* comment field temporaily unavailable
export function processCommentField(comments: any[]): any[] {
  if (!comments) return [];

  return comments.map((c) => ({
    ...c,
    id: c.id || uuidv4(),
    posting_date: c.posting_date || new Date().toISOString(),
  }));
}
  */

/**
 * Process contract field to ensure proper boolean conversion
 */
export function processContractField(value: string | boolean): boolean {
  if (value === 'true' || value === true) {
    return true;
  }
  return false;
}

export function isValidUrl(url: unknown): boolean {
  return Boolean(url) && typeof url === 'string' && !url.endsWith('-');
}

export function processIdCardUrls(
  formData: Record<string, any>,
  idCardFrontUrls: string[],
  idCardBackUrls: string[],
): { frontInfo: string; backInfo: string } {
  let front: string | undefined;
  let back: string | undefined;

  if (idCardFrontUrls.length > 0) {
    front = idCardFrontUrls[0]; // take the first uploaded
  } else if (formData.id_card_front) {
    front = Array.isArray(formData.id_card_front)
      ? formData.id_card_front[0]
      : formData.id_card_front;
  }

  if (idCardBackUrls.length > 0) {
    back = idCardBackUrls[0]; // take the first uploaded
  } else if (formData.id_card_back) {
    back = Array.isArray(formData.id_card_back) ? formData.id_card_back[0] : formData.id_card_back;
  }

  return {
    frontInfo: front || '',
    backInfo: back || '',
  };
}

export function processNormalMemberUrl(formData: Record<string, any>, imageUrl: string): string {
  console.log('image_url_one', imageUrl);
  // Validate the URL (if needed)
  return isValidUrl(imageUrl) ? imageUrl : '';
}

export function verifyDdbClient(app: CustomFastifyInstance): any {
  const ddbDocClient = app.ddbDocClient;
  if (!ddbDocClient) {
    throw new Error('DynamoDB Client is not initialized');
  }
  return ddbDocClient;
}

export async function processIdCardImages(
  value: string,
  formData: Record<string, any>,
  urlsArray: string[],
  fieldType: string,
): Promise<void> {
  try {
    // Handle empty string case - user wants to clear the field
    if (value === "" || value.trim() === "") {
      console.log(`Empty string provided for ${fieldType} - field will be cleared`);
      // Don't add anything to urlsArray, leaving it empty
      // The empty urlsArray will be handled in the PUT case logic
      return;
    }

    const base64Array = parseArrayData(value);
    const clientId = formData.client_id || 'temp-client-id';

    for (const base64Data of base64Array) {
      if (!base64Data || typeof base64Data !== 'string') {
        console.warn(`Skipping invalid base64 data in ${fieldType}`);
        continue;
      }

      const s3Url = await processBase64Image(
        base64Data,
        'individual_customer_register_files',
        clientId,
      );
      urlsArray.push(s3Url);
    }
  } catch (error) {
    console.error(`Error processing ${fieldType}:`, error);
    throw new Error(`Error processing ${fieldType}: ${(error as Error).message}`);
  }
}

/**
 * Process JSON fields that should contain arrays
 */
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

export async function processFormField(
  fieldName: string,
  value: string,
  formData: Record<string, any>,
  idCardFrontUrls: string[],
  idCardBackUrls: string[],
): Promise<void> {
  if (fieldName === 'id_card_front') {
    // Always set in formData to track that this field was provided
    formData[fieldName] = value;
    await processIdCardImages(value, formData, idCardFrontUrls, 'id_card_front');
  } else if (fieldName === 'id_card_back') {
    // Always set in formData to track that this field was provided
    formData[fieldName] = value;
    await processIdCardImages(value, formData, idCardBackUrls, 'id_card_back');
  } else if (['comment', 'tags', 'linked_doc', 'linked_prop', 'meeting_info'].includes(fieldName)) {
    processJsonField(fieldName, value, formData);
  } else {
    formData[fieldName] = value;
  }
}

export async function processMemberFormField(
  fieldName: string,
  value: string,
  formData: Record<string, any>,
): Promise<string> {
  let image_url: string;
  if (fieldName === 'image_url') {
    image_url = await processMemberCardImages(value, formData);
    return image_url;
  } else if (['comment', 'tags', 'linked_doc', 'linked_prop', 'meeting_info'].includes(fieldName)) {
    processJsonField(fieldName, value, formData);
  } else {
    formData[fieldName] = value;
  }
  return '';
}

export async function processFormData(req: FastifyRequest, clientId?: string): Promise<{
  formData: Record<string, any>;
  idCardFrontUrls: string[];
  idCardBackUrls: string[];
}> {
  const formData: Record<string, any> = {};
  const idCardFrontUrls: string[] = [];
  const idCardBackUrls: string[] = [];

  // clientIdがある場合はformDataに設定
  if (clientId) {
    formData.client_id = clientId;
  }

  const parts = req.parts();

  for await (const part of parts) {
    if (part.type === 'field') {
      await processFormField(
        part.fieldname,
        part.value as string,
        formData,
        idCardFrontUrls,
        idCardBackUrls,
      );
    }
  }

  return { formData, idCardFrontUrls, idCardBackUrls };
}

export function prepareCustomerUpdates(
  customerData: Record<string, any>,
  idCardFrontUrls: string[],
  idCardBackUrls: string[],
): Record<string, any> {
  const updates: Record<string, any> = {};

  // Only include valid customer fields
  const validCustomerKeys = new Set([
    'employee_id',
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
    'id_card_front',
    'id_card_back',
    'id_card_front_path',
    'id_card_back_path',
    'update_timestamp',
  ]);

  Object.keys(customerData).forEach((key) => {
    if (validCustomerKeys.has(key)) {
      updates[key] = customerData[key];
    }
  });

  // Handle id_card_front
  if (customerData._clear_id_card_front) {

    updates.id_card_front = '';
  } else if (idCardFrontUrls && idCardFrontUrls.length > 0) {

    updates.id_card_front = idCardFrontUrls[0];
  } else if (customerData['id_card_front'] && !customerData._clear_id_card_front) {

    updates.id_card_front = Array.isArray(customerData['id_card_front'])
      ? customerData['id_card_front'][0]
      : customerData['id_card_front'];
  }

  // Handle id_card_back
  if (customerData._clear_id_card_back) {

    updates.id_card_back = '';
  } else if (idCardBackUrls && idCardBackUrls.length > 0) {

    updates.id_card_back = idCardBackUrls[0]; // Just one string
  } else if (customerData['id_card_back'] && !customerData._clear_id_card_back) {

    updates.id_card_back = Array.isArray(customerData['id_card_back'])
      ? customerData['id_card_back'][0]
      : customerData['id_card_back'];
  }


  if (!updates.update_timestamp) {
    updates.update_timestamp = new Date().toISOString();
  }

  return updates;
}
export const generateCustomerRegistrationNumber = (): number => {
  const min = 0;
  const max = 9999999;
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

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
