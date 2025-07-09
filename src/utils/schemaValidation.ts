/**
 * DynamoDBスキーマ検証ユーティリティ
 * 
 * 各テーブルのスキーマに基づいて、データの整合性を確認する
 */

import { getSchemaByTableName } from '@src/schemas/dynamoSchemas';

/**
 * データがスキーマの必須フィールドを満たしているかを確認
 */
export const validateRequiredFields = (
  tableName: string,
  data: Record<string, any>
): { isValid: boolean; missingFields: string[] } => {
  const schema = getSchemaByTableName(tableName);
  
  if (!schema) {
    return { isValid: false, missingFields: [`Unknown table: ${tableName}`] };
  }
  
  const missingFields = schema.requiredFields.filter(
    (field: string) => data[field] === undefined || data[field] === null
  );
  
  return {
    isValid: missingFields.length === 0,
    missingFields,
  };
};

/**
 * データがスキーマで定義されたフィールドのみを含んでいるかを確認
 */
export const validateAllowedFields = (
  tableName: string,
  data: Record<string, any>
): { isValid: boolean; extraFields: string[] } => {
  const schema = getSchemaByTableName(tableName);
  
  if (!schema) {
    return { isValid: false, extraFields: [`Unknown table: ${tableName}`] };
  }
  
  const allowedFields = [
    ...schema.requiredFields,
    ...schema.optionalFields,
  ];
  
  const extraFields = Object.keys(data).filter(
    (field) => !allowedFields.includes(field)
  );
  
  return {
    isValid: extraFields.length === 0,
    extraFields,
  };
};

/**
 * データ型の検証
 */
export const validateFieldTypes = (
  tableName: string,
  data: Record<string, any>
): { isValid: boolean; typeErrors: string[] } => {
  const schema = getSchemaByTableName(tableName);
  
  if (!schema) {
    return { isValid: false, typeErrors: [`Unknown table: ${tableName}`] };
  }
  
  const typeErrors: string[] = [];
  
  Object.entries(data).forEach(([fieldName, value]) => {
    if (value === null || value === undefined) {
      return; // null/undefined は型チェックをスキップ
    }
    
    const expectedType = schema.fieldTypes[fieldName];
    if (!expectedType) {
      return; // 未定義フィールドは別の検証でキャッチ
    }
    
    let actualType: string = typeof value;
    
    // 配列の場合
    if (Array.isArray(value)) {
      actualType = 'array';
    }
    
    // オブジェクトの場合（配列でない場合）
    if (actualType === 'object' && !Array.isArray(value)) {
      actualType = 'object';
    }
    
    if (actualType !== expectedType) {
      typeErrors.push(
        `Field "${fieldName}" expected type "${expectedType}" but got "${actualType}"`
      );
    }
  });
  
  return {
    isValid: typeErrors.length === 0,
    typeErrors,
  };
};

/**
 * 包括的なデータ検証
 */
export const validateTableData = (
  tableName: string,
  data: Record<string, any>
): {
  isValid: boolean;
  errors: {
    missingFields: string[];
    extraFields: string[];
    typeErrors: string[];
  };
} => {
  const requiredValidation = validateRequiredFields(tableName, data);
  const allowedValidation = validateAllowedFields(tableName, data);
  const typeValidation = validateFieldTypes(tableName, data);
  
  const isValid = 
    requiredValidation.isValid && 
    allowedValidation.isValid && 
    typeValidation.isValid;
  
  return {
    isValid,
    errors: {
      missingFields: requiredValidation.missingFields,
      extraFields: allowedValidation.extraFields,
      typeErrors: typeValidation.typeErrors,
    },
  };
};

/**
 * DynamoDBキー（PK, SK）の検証
 */
export const validateTableKeys = (
  tableName: string,
  data: Record<string, any>
): { isValid: boolean; missingKeys: string[] } => {
  const schema = getSchemaByTableName(tableName);
  
  if (!schema) {
    return { isValid: false, missingKeys: [`Unknown table: ${tableName}`] };
  }
  
  const requiredKeys = [schema.keys.partitionKey, schema.keys.sortKey];
  const missingKeys = requiredKeys.filter(
    (key) => data[key] === undefined || data[key] === null
  );
  
  return {
    isValid: missingKeys.length === 0,
    missingKeys,
  };
}; 