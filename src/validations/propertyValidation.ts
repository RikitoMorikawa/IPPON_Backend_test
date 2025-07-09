import { FastifyReply } from 'fastify';
import { errorResponse, successResponse } from '@src/responses';
import { SUCCESS_MESSAGES, ERROR_MESSAGES } from '@src/responses/constants/propertyConstant';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { createProperty, isPropertyNameTaken } from '@src/repositroies/propertyModel';
import { v4 as uuidv4 } from 'uuid';
import { Property } from '@src/interfaces/propertyInterfaces';

export const validateProperty = (property: Property) => {
  const errors: string[] = [];
  
  // 必須フィールドのバリデーション
  if (!property.name) errors.push('name is required');
  if (!property.type) errors.push('type is required');
  if (!property.postal_code) errors.push('postal_code is required');
  if (!property.prefecture) errors.push('prefecture is required');
  if (!property.city) errors.push('city is required');
  if (!property.block_number) errors.push('block_number is required');
  if (!property.owner_last_name) errors.push('owner_last_name is required');
  if (!property.owner_first_name) errors.push('owner_first_name is required');
  if (!property.sales_start_date) errors.push('sales_start_date is required');
  if (!property.price) errors.push('price is required');
  
  // 物件タイプのバリデーション（日本語のみ）
  const validTypes = ['土地', 'マンション', '新築'];
  if (property.type && !validTypes.includes(property.type)) {
    errors.push('type must be one of: 土地, マンション, 新築');
  }

  return errors;
};

// 更新用のバリデーション（部分的な更新を許可）
export const validatePropertyUpdate = (property: Partial<Property>) => {
  const errors: string[] = [];
  
  // 物件タイプのバリデーション（存在する場合のみチェック、日本語のみ）
  const validTypes = ['土地', 'マンション', '新築'];
  if (property.type && !validTypes.includes(property.type)) {
    errors.push('type must be one of: 土地, マンション, 新築');
  }
  
  // 価格が存在する場合は数値かチェック
  if (property.price !== undefined && property.price !== null) {
    if (isNaN(Number(property.price))) {
      errors.push('price must be a valid number');
    }
  }

  return errors;
};

export async function validateAndSaveProperty(
  ddbDocClient: DynamoDBClient,
  newProperty: Property,
  reply: FastifyReply,
): Promise<void> {
  const validationErrors = validateProperty(newProperty);
  if (validationErrors.length > 0) {
    reply.status(400).send(errorResponse(400, ERROR_MESSAGES.VALIDATION_ERROR, validationErrors));
    return;
  }

  const nameExists = await isPropertyNameTaken(
    ddbDocClient,
    newProperty.client_id,
    newProperty.name,
  );
  if (nameExists) {
    reply.status(409).send(errorResponse(409, 'Property name already exists.'));
    return;
  }

  await createProperty(ddbDocClient, newProperty);
  reply.status(201).send(successResponse(201, SUCCESS_MESSAGES.PROPERTY_REGISTERED, newProperty));
}

export function createPropertyObject(formData: Partial<Property>): Property {
  const timestamp = new Date().toISOString();

  return {
    id: uuidv4(),
    client_id: formData.client_id!,
    name: formData.name!,
    type: formData.type!,
    postal_code: formData.postal_code!,
    prefecture: formData.prefecture!,
    city: formData.city!,
    block_number: formData.block_number!,
    building: formData.building,
    room_number: formData.room_number,
    nearest_stations: formData.nearest_stations,
    owner_last_name: formData.owner_last_name!,
    owner_first_name: formData.owner_first_name!,
    owner_last_name_kana: formData.owner_last_name_kana,
    owner_first_name_kana: formData.owner_first_name_kana,
    sales_start_date: formData.sales_start_date!,
    price: Number(formData.price),
    delivery_time: formData.delivery_time,
    delivery_method: formData.delivery_method,
    transaction_type: formData.transaction_type,
    current_condition: formData.current_condition,
    image_urls: formData.image_urls,
    remarks: formData.remarks,
    details: formData.details,
    created_at: timestamp,
    updated_at: timestamp,
    deleted_at: formData.deleted_at,
    inquiry_count: formData.inquiry_count || 0,
  };
}

export function validateRequiredFields(formData: Partial<Property>, reply: FastifyReply): boolean {
  if (!formData.id) {
    reply.status(200).send(successResponse(200, ERROR_MESSAGES.PROPERTY_ID_REQUIRED_ERROR));
    return false;
  }

  if (!formData.client_id) {
    reply.status(200).send(successResponse(200, ERROR_MESSAGES.CLIENDTT_ID_REQUIRED_ERROR));
    return false;
  }

  return true;
}

export async function validateAndSaveUpdatedProperty(
  ddbDocClient: DynamoDBClient,
  updatedProperty: Property,
  reply: FastifyReply,
): Promise<void> {
  // 更新用のバリデーションを使用（部分的な更新を許可）
  const validationErrors = validatePropertyUpdate(updatedProperty);
  if (validationErrors.length > 0) {
    reply.status(400).send(errorResponse(400, ERROR_MESSAGES.VALIDATION_ERROR, validationErrors));
    return;
  }

  await createProperty(ddbDocClient, updatedProperty);

  reply.status(200).send(successResponse(200, SUCCESS_MESSAGES.PROPERTY_UPDATED, updatedProperty));
}
