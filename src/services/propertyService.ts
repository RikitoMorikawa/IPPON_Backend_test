import { processBase64Image, parseArrayData } from '@src/services/processImageAndArray';
import { errorResponse } from '@src/responses';
import { FastifyReply } from 'fastify';
import { ERROR_MESSAGES } from '@src/responses/constants/propertyConstant';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  searchProperties,
  getPropertyById,
  deleteProperties,
  executeBatchDelete,
} from '@src/repositroies/propertyModel';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { CustomFastifyInstance } from '@src/interfaces/CustomFastifyInstance';
import {
  NearestStationData,
  Property,
  PropertySearchParams,
  PropertyDetails,
} from '@src/interfaces/propertyInterfaces';
import config from '@src/config';


export async function parsePropertyFormData(
  parts: AsyncIterableIterator<any>,
  clientId?: string,
): Promise<Partial<Property>> {
  const formData: Partial<Property> = {
    //line_status: false
  };
  const propertyFileUrls: string[] = [];

  if (clientId) {
    formData.client_id = clientId;
  }

  for await (const part of parts) {
    if (part.type === 'field') {
      await processFormField(part, formData, propertyFileUrls);
    }
  }

  formData.image_urls = propertyFileUrls
    .filter((url) => url && typeof url === 'string' && !url.endsWith('-'));

  return formData;
}

export async function processFormField(
  part: any,
  formData: Partial<Property>,
  propertyFileUrls: string[],
): Promise<void> {
  const fieldName = part.fieldname;
  const fieldValue = part.value as string;

  if (fieldName === 'image_urls') {
    await processPropertyFiles(
      fieldValue,
      propertyFileUrls,
      formData.client_id || 'temp-client-id',
    );
  } else if (['nearest_stations', 'details'].includes(fieldName)) {
    processJsonField(fieldName, fieldValue, formData);
  } else if (fieldName !== 'line_status') {
    (formData as Record<string, any>)[fieldName] = fieldValue; // Assign any fields except line_status
  }
}

async function processPropertyFiles(
  fieldValue: string,
  propertyFileUrls: string[],
  clientId: string,
): Promise<void> {
  try {
    const base64Array = parseArrayData(fieldValue);

    for (const base64Data of base64Array) {
      if (!base64Data || typeof base64Data !== 'string') {
        continue;
      }

      const s3Url = await processBase64Image(base64Data, 'image_urls', clientId, 'property');
      propertyFileUrls.push(s3Url);
    }
  } catch (error) {
    throw new Error(`Error processing image_urls: ${(error as Error).message}`);
  }
}

function processJsonField(
  fieldName: string,
  fieldValue: string,
  formData: Partial<Property>,
): void {
  try {
    const parsedValue = JSON.parse(fieldValue);

    switch (fieldName) {
      case 'nearest_stations':
        formData.nearest_stations = parsedValue as NearestStationData[];
        break;
      case 'details':
        formData.details = parsedValue as PropertyDetails;
        break;
      default:
        throw new Error(`Unsupported JSON field: ${fieldName}`);
    }
  } catch (error) {
    throw new Error(`Invalid JSON format for ${fieldName}`);
  }
}

export async function processUpdateFormField(
  part: any,
  formData: Partial<Property>,
  propertyFileUrls: string[],
  booleanFields: Set<string>,
): Promise<void> {
  const fieldName = part.fieldname;
  //const fieldValue = part.value as string;
  const fieldValue = (part.value as string).trim();

  if (fieldName === 'property_id') {
    formData.id = fieldValue;
  } else if (fieldName === 'image_urls') {
    await processPropertyFileForUpdate(
      fieldValue,
      propertyFileUrls,
      formData.client_id || 'temp-client-id',
    );
  } else if (['nearest_stations', 'details'].includes(fieldName)) {
    processJsonField(fieldName, fieldValue, formData);
  } else {
    if (booleanFields.has(fieldName)) {
      (formData as Record<string, any>)[fieldName] = fieldValue === 'true';
    } else {
      (formData as Record<string, any>)[fieldName] = fieldValue;
    }
  }
}

async function processPropertyFileForUpdate(
  fieldValue: string,
  propertyFileUrls: string[],
  clientId: string,
): Promise<void> {
  try {
    console.log('🔍 [DEBUG] processPropertyFileForUpdate called with fieldValue length:', fieldValue.length);
    const base64Array = parseArrayData(fieldValue);
    console.log('🔍 [DEBUG] base64Array length:', base64Array.length);

    for (let i = 0; i < base64Array.length; i++) {
      const base64Data = base64Array[i];
      if (!base64Data || typeof base64Data !== 'string') {
        console.log(`🔍 [DEBUG] Skipping invalid base64Data at index ${i}`);
        continue;
      }

      console.log(`🔍 [DEBUG] Processing image ${i + 1}/${base64Array.length}`);
      const s3Url = await processBase64Image(base64Data, 'image_urls', clientId, 'property');
      console.log('🔍 [DEBUG] S3 upload successful, URL:', s3Url);
      propertyFileUrls.push(s3Url);
    }
    console.log('🔍 [DEBUG] Total uploaded images:', propertyFileUrls.length);
  } catch (error) {
    console.error('❌ [ERROR] processPropertyFileForUpdate failed:', error);
    throw new Error(`Error processing image_urls: ${(error as Error).message}`);
  }
}

export function processPropertyFileUploads(
  formData: Partial<Property>,
  propertyFileUrls: string[],
): void {
  console.log('🔍 [DEBUG] processPropertyFileUploads called');
  console.log('🔍 [DEBUG] propertyFileUrls length:', propertyFileUrls.length);
  console.log('🔍 [DEBUG] propertyFileUrls:', propertyFileUrls);
  console.log('🔍 [DEBUG] formData.image_urls before processing:', formData.image_urls);

  if (propertyFileUrls.length > 0) {
    console.log('🔍 [DEBUG] Adding new files to existing image_urls');
    if (formData.image_urls) {
      const existingFiles = Array.isArray(formData.image_urls)
        ? formData.image_urls
        : [formData.image_urls];
      console.log('🔍 [DEBUG] existingFiles:', existingFiles);

      formData.image_urls = [...existingFiles, ...propertyFileUrls];
      console.log('🔍 [DEBUG] Combined image_urls:', formData.image_urls);
    } else {
      console.log('🔍 [DEBUG] No existing files, setting new files only');
      formData.image_urls = propertyFileUrls;
    }
  } else if (formData.image_urls) {
    console.log('🔍 [DEBUG] No new files, preserving existing files');
    formData.image_urls = Array.isArray(formData.image_urls)
      ? formData.image_urls
      : [formData.image_urls];
  }

  formData.image_urls = formData.image_urls || [];
  console.log('🔍 [DEBUG] Final image_urls:', formData.image_urls);
}

export async function parseUpdateFormData(
  parts: AsyncIterableIterator<any>,
  clientId?: string,
): Promise<Partial<Property>> {
  const formData: Partial<Property> = {};
  const propertyFileUrls: string[] = [];
  const booleanFields = new Set(['bicycle_parking', 'monthly_bicycle_parking_fee', 'line_status']);

  if (clientId) {
    formData.client_id = clientId;
  }

  console.log('🔍 [DEBUG] parseUpdateFormData started');

  for await (const part of parts) {
    if (part.type === 'field') {
      console.log(`🔍 [DEBUG] Processing field: ${part.fieldname}, value type: ${typeof part.value}`);
      await processUpdateFormField(part, formData, propertyFileUrls, booleanFields);
    }
  }

  console.log('🔍 [DEBUG] Before processPropertyFileUploads:');
  console.log('🔍 [DEBUG] propertyFileUrls:', propertyFileUrls);
  console.log('🔍 [DEBUG] formData.image_urls:', formData.image_urls);

  processPropertyFileUploads(formData, propertyFileUrls);

  console.log('🔍 [DEBUG] After processPropertyFileUploads:');
  console.log('🔍 [DEBUG] Final formData.image_urls:', formData.image_urls);
  
  return formData;
}

export async function fetchExistingProperty(
  ddbDocClient: DynamoDBClient,
  formData: Partial<Property>,
  reply: FastifyReply,
): Promise<Property | null> {
  const existingPropertyResult = await getPropertyById(
    ddbDocClient,
    formData.id!,
    formData.client_id!,
  );
  const existingProperty = existingPropertyResult.Items?.[0] as Property;

  if (!existingProperty) {
    reply.status(404).send(errorResponse(404, ERROR_MESSAGES.PROPERTY_NOT_FOUND_ERROR));
    return null;
  }

  return existingProperty;
}

export function createUpdatedPropertyObject(
  existingProperty: Property,
  formData: Partial<Property>,
): Property {
  const now = new Date().toISOString();
  
  console.log('🔍 [DEBUG] createUpdatedPropertyObject called');
  console.log('🔍 [DEBUG] formData.image_urls:', formData.image_urls);
  console.log('🔍 [DEBUG] existingProperty.image_urls:', existingProperty.image_urls);

  // 既存の画像URLと新しい画像URLをマージ
  let mergedImageUrls: string[] = [];
  
  if (existingProperty.image_urls && Array.isArray(existingProperty.image_urls)) {
    mergedImageUrls = [...existingProperty.image_urls];
  }
  
  if (formData.image_urls && Array.isArray(formData.image_urls)) {
    mergedImageUrls = [...mergedImageUrls, ...formData.image_urls];
  }

  console.log('🔍 [DEBUG] Merged image_urls:', mergedImageUrls);

  const updatedProperty = {
    ...existingProperty,
    ...formData,
    image_urls: mergedImageUrls, // マージした画像URLを使用

    id: existingProperty.id,
    client_id: existingProperty.client_id,
    created_at: existingProperty.created_at,
    updated_at: now, // 更新時に新しいタイムスタンプを設定
  };

  console.log('🔍 [DEBUG] Final updatedProperty.image_urls:', updatedProperty.image_urls);
  
  return updatedProperty;
}

export const searchPropertiesWithFilters = async (
  ddbDocClient: DynamoDBDocumentClient,
  params: PropertySearchParams,
  clientId: string,
  limit: number = 10,
  page: number = 1,
  exclusiveStartKey?: Record<string, any>,
) => {
  const [pagedResult, countResult] = await Promise.all([
    searchProperties(
      ddbDocClient,
      params.objectName || '',
      params.registrationRange || '',
      params.prefecture || '',
      params.exclusive_area || '',
      params.price || '',
      params.property_type || '',
      clientId,
      limit,
      page,
      exclusiveStartKey,
    ),
    // For count: set limit = 0 and remove ExclusiveStartKey inside searchProperties
    searchProperties(
      ddbDocClient,
      params.objectName || '',
      params.registrationRange || '',
      params.prefecture || '',
      params.exclusive_area || '',
      params.price || '',
      params.property_type || '',
      clientId,
      0, // for count
      1,
    ).then((res) => res.total),
  ]);

  const total = countResult || 0;
  const items = pagedResult.items || [];
  const lastKey = pagedResult.lastEvaluatedKey || null;
  const pages = Math.ceil(total / limit);

  return {
    items,
    total,
    limit,
    page,
    pages,
    lastEvaluatedKey: lastKey,
  };
};

export const deletePropertiesByIds = async (
  app: CustomFastifyInstance,
  propIds: string,
  clientId: string,
): Promise<{ success: boolean; reason?: string }> => {
  const ddbDocClient = app.ddbDocClient;
  if (!ddbDocClient) {
    throw new Error('DynamoDB Client is not initialized');
  }

  const propertyIdArray = propIds.split(',').map((id) => id.trim());
  const clientIdString = Array(propertyIdArray.length).fill(clientId).join(',');
  
  const deleteResult = await deleteProperties(ddbDocClient, propIds, clientIdString);

  if (deleteResult.properties.length === 0) {
    return { success: false, reason: 'NOT_FOUND' };
  }

  const deleteParams: { RequestItems: { [key: string]: any } } = { RequestItems: {} };
  deleteParams.RequestItems[config.tableNames.properties] = deleteResult.properties;
  await executeBatchDelete(ddbDocClient, deleteParams);
  
  return { success: true };
};
