import {
  DynamoDBDocumentClient,
  PutCommand,
  ScanCommandOutput,
} from '@aws-sdk/lib-dynamodb';
import config from '@src/config';
import dayjs from 'dayjs';
import { Property, PropertySearchParams } from '@src/interfaces/propertyInterfaces';
import { queryWithoutDeleted, scanWithoutDeleted, softDeleteDynamo } from '@src/utils/softDelete';
import { PREFECTURE_MAPPING, PrefectureCode } from '@src/enums/propertyEnums';

export const createProperty = async (ddbDocClient: DynamoDBDocumentClient, property: Property) => {
  const params = {
    TableName: config.tableNames.properties,
    Item: property,
  };
  await ddbDocClient.send(new PutCommand(params));
};

export const getPropertyById = async (
  ddbDocClient: DynamoDBDocumentClient,
  propId: string,
  client_id: string,
) => {
  console.log(propId, client_id);
  const params = {
    TableName: config.tableNames.properties,
    FilterExpression: 'id = :id AND client_id = :client_id',
    ExpressionAttributeValues: {
      ':client_id': client_id,
      ':id': propId,
    },
  };
  return await scanWithoutDeleted(ddbDocClient, params);
};

export const buildDeleteParams = (deleteRequests: { props: any[] }) => {

  return {
    RequestItems: {
      [config.tableNames.properties]: deleteRequests.props,
    },
  };
};

export const getPropertiesByName = async (
  ddbDocClient: DynamoDBDocumentClient,
  clientId: string,
  propertyName: string,
): Promise<Property[]> => {
  const params = {
    TableName: config.tableNames.properties,
    FilterExpression: 'client_id = :clientId AND #name = :propertyName',
    ExpressionAttributeNames: {
      '#name': 'name'
    },
    ExpressionAttributeValues: {
      ':clientId': clientId,
      ':propertyName': propertyName,
    },
  };

  const result = await scanWithoutDeleted(ddbDocClient, params);

  if (result.Items && result.Items.length > 0) {
    return result.Items as Property[];
  }
  return [];
};

export const getPropertyByContractorAmount = async (
  ddbDocClient: DynamoDBDocumentClient,
  contractor_amount: string,
): Promise<Property | null> => {
  const params = {
    TableName: config.tableNames.properties,
    FilterExpression: 'contractor_amount = :contractor_amount',
    ExpressionAttributeValues: {
      ':contractor_amount': contractor_amount,
    },
  };

  const result = await scanWithoutDeleted(ddbDocClient, params);

  if (result.Items && result.Items.length > 0) {
    const foundProperty = result.Items[0];
    return foundProperty as Property;
  }
  return null;
};

export const getPropertyIdsByRent = async (
  ddbDocClient: DynamoDBDocumentClient,
  rent: string,
): Promise<string[]> => {
  let minPrice: number | undefined;
  let maxPrice: number | undefined;

  switch (rent) {
    case '1':
      maxPrice = 100000;
      break;
    case '2':
      minPrice = 100001;
      maxPrice = 200000;
      break;
    case '3':
      minPrice = 200001;
      maxPrice = 500000;
      break;
    case '4':
      minPrice = 500001;
      maxPrice = 1000000;
      break;
    case '5':
      minPrice = 1000001;
      break;
    default:
      return [];
  }

  const params: any = {
    TableName: config.tableNames.properties,
  };

  if (minPrice !== undefined && maxPrice !== undefined) {
    params.FilterExpression = 'rent BETWEEN :minPrice AND :maxPrice';
    params.ExpressionAttributeValues = {
      ':minPrice': minPrice,
      ':maxPrice': maxPrice,
    };
  } else if (minPrice !== undefined) {
    params.FilterExpression = 'rent >= :minPrice';
    params.ExpressionAttributeValues = {
      ':minPrice': minPrice,
    };
  } else if (maxPrice !== undefined) {
    params.FilterExpression = 'rent <= :maxPrice';
    params.ExpressionAttributeValues = {
      ':maxPrice': maxPrice,
    };
  }

  try {
    const result = await scanWithoutDeleted(ddbDocClient, params);
    const propertyIds = result.Items?.map((item: any) => item.prop_id) || [];
    return propertyIds;
  } catch (error) {
    return [];
  }
};

export const getPropertyByRentalPrice = async (
  ddbDocClient: DynamoDBDocumentClient,
  rental_price: string,
): Promise<Property | null> => {
  const params = {
    TableName: config.tableNames.properties,
    FilterExpression: 'rental_price = :rental_price',
    ExpressionAttributeValues: {
      ':rental_price': rental_price,
    },
  };

  const result = await scanWithoutDeleted(ddbDocClient, params);

  if (result.Items && result.Items.length > 0) {
    const foundProperty = result.Items[0];
    return foundProperty as Property;
  }

  return null;
};

export const searchProperties = async (
  ddbDocClient: DynamoDBDocumentClient,
  objectName: string | undefined,
  registrationRange: string | undefined,
  prefecture: string | undefined,
  exclusive_area: string | undefined,
  price: string | undefined,
  property_type: string | undefined,
  clientId: string,
  limit: number,
  page: number,
  exclusiveStartKey?: Record<string, any>,
): Promise<any> => {
  const params: any = {
    TableName: config.tableNames.properties,
    FilterExpression: '1 = 1',
    ExpressionAttributeValues: {},
    Limit: limit,
  };

  if (exclusiveStartKey) {
    params.ExclusiveStartKey = exclusiveStartKey;
  }

  const filterExpressions: string[] = [];

  if (objectName) {
    filterExpressions.push('contains(name, :objectName)');
    params.ExpressionAttributeValues[':objectName'] = objectName;
  }

  if (clientId) {
    filterExpressions.push('client_id = :clientId');
    params.ExpressionAttributeValues[':clientId'] = clientId;
  }

  if (registrationRange) {
    const now = dayjs();
    let startDate: string;
    let endDate: string;

    switch (registrationRange) {
      case '1':
        endDate = now.endOf('day').toISOString();
        startDate = now.subtract(1, 'month').startOf('day').toISOString();
        break;
      case '2':
        endDate = now.endOf('day').toISOString();
        startDate = now.subtract(2, 'months').startOf('day').toISOString();
        break;
      case '3':
        endDate = now.endOf('day').toISOString();
        startDate = now.subtract(3, 'months').startOf('day').toISOString();
        break;
      case '4':
        endDate = now.endOf('day').toISOString();
        startDate = now.subtract(6, 'months').startOf('day').toISOString();
        break;
      case '5':
        endDate = now.endOf('day').toISOString();
        startDate = now.subtract(1, 'year').startOf('day').toISOString();
        break;
      default:
        endDate = now.endOf('day').toISOString();
        startDate = now.subtract(1, 'year').startOf('day').toISOString();
    }
    filterExpressions.push('created_at >= :startDate AND created_at <= :endDate');
    params.ExpressionAttributeValues[':startDate'] = startDate;
    params.ExpressionAttributeValues[':endDate'] = endDate;
  }

  // 都道府県の変換処理を削除し、そのまま数字の文字列で検索
  if (prefecture) {
    filterExpressions.push('prefecture = :prefecture');
    params.ExpressionAttributeValues[':prefecture'] = prefecture;
  }

  let propertyType;

  switch (property_type) {
    case '1':
      property_type = '土地';
      break;
    case '2':
      property_type = 'マンション';
      break;
    case '3':
      property_type = '新築';
      break;
    case '4':
      property_type = '指定なし';
      break;

    default:
      break;
  }

  if (propertyType) {
    filterExpressions.push('property_type = :property_type');
    params.ExpressionAttributeValues[':property_type'] = propertyType;
  }

  if (exclusive_area) {
    let minArea: number | undefined;
    let maxArea: number | undefined;

    switch (exclusive_area) {
      case '1':
        maxArea = 30;
        break;
      case '2':
        minArea = 31;
        maxArea = 49;
        break;
      case '3':
        minArea = 50;
        maxArea = 69;
        break;
      case '4':
        minArea = 70;
        maxArea = 89;
        break;
      case '5':
        minArea = 90;
        maxArea = 109;
        break;
      case '6':
        minArea = 110;
        maxArea = 130;
        break;
      case '7':
        minArea = 131;
        break;
      case '8':
        break;
      default:
        break;
    }

    if (typeof minArea === 'number' && typeof maxArea === 'number') {
      filterExpressions.push('exclusive_area BETWEEN :minArea AND :maxArea');
      params.ExpressionAttributeValues[':minArea'] = minArea;
      params.ExpressionAttributeValues[':maxArea'] = maxArea;
    } else if (typeof minArea === 'number') {
      filterExpressions.push('exclusive_area >= :minArea');
      params.ExpressionAttributeValues[':minArea'] = minArea;
    } else if (typeof maxArea === 'number') {
      filterExpressions.push('exclusive_area <= :maxArea');
      params.ExpressionAttributeValues[':maxArea'] = maxArea;
    }
  }

  if (price) {
    let minPrice: number | undefined;
    let maxPrice: number | undefined;

    switch (price) {
      case '1': // ~5 million
        maxPrice = 5000000;
        break;
      case '2': // 5M ~ 10M
        minPrice = 5000001;
        maxPrice = 10000000;
        break;
      case '3': // 10M ~ 20M
        minPrice = 10000001;
        maxPrice = 20000000;
        break;
      case '4': // 20M ~ 30M
        minPrice = 20000001;
        maxPrice = 30000000;
        break;
      case '5': // 30M ~ 40M
        minPrice = 30000001;
        maxPrice = 40000000;
        break;
      case '6': // 40M ~ 50M
        minPrice = 40000001;
        maxPrice = 50000000;
        break;
      case '7': // 50M ~ 70M
        minPrice = 50000001;
        maxPrice = 70000000;
        break;
      case '8': // 70M ~ 100M
        minPrice = 70000001;
        maxPrice = 100000000;
        break;
      case '9': // 100M ~ and up
        minPrice = 100000001;
        break;
      case '10': // 指定なし (not specified)
        minPrice = undefined;
        maxPrice = undefined;
        break;
      default:
        minPrice = undefined;
        maxPrice = undefined;
        break;
    }

    if (typeof minPrice === 'number' && typeof maxPrice === 'number') {
      filterExpressions.push('price BETWEEN :minPrice AND :maxPrice');
      params.ExpressionAttributeValues[':minPrice'] = minPrice;
      params.ExpressionAttributeValues[':maxPrice'] = maxPrice;
    } else if (typeof minPrice === 'number') {
      filterExpressions.push('price >= :minPrice');
      params.ExpressionAttributeValues[':minPrice'] = minPrice;
    } else if (typeof maxPrice === 'number') {
      filterExpressions.push('price <= :maxPrice');
      params.ExpressionAttributeValues[':maxPrice'] = maxPrice;
    }
  }

  // Apply filter expression
  if (filterExpressions.length > 0) {
    params.FilterExpression = filterExpressions.join(' AND ');
  }

  // Execute Scan for paginated items
  const result = await scanWithoutDeleted(ddbDocClient, params);

  // Execute Scan again to count total items matching filter
  const countParams = {
    ...params,
    Select: 'COUNT',
  };
  delete countParams.Limit;
  delete countParams.ExclusiveStartKey;

  const countResult = await scanWithoutDeleted(ddbDocClient, countParams);
  const totalCount = countResult.Count || 0;

  return {
    total: totalCount,
    limit,
    page,
    items: result.Items || [],
    lastEvaluatedKey: result.LastEvaluatedKey || null,
  };
};

export const fetchAllProperties = async (
  ddbDocClient: DynamoDBDocumentClient,
  clientId: string,
  limit: number = 10,
  lastKey?: Record<string, any>,
) => {
  try {
    const result = await scanWithoutDeleted(ddbDocClient, {
        TableName: config.tableNames.properties,
        FilterExpression: 'client_id = :clientId',
        ExpressionAttributeValues: {
          ':clientId': clientId,
        },
        Limit: limit,
        ExclusiveStartKey: lastKey || undefined,
      });

    return {
      items: result.Items || [],
      lastKey: result.LastEvaluatedKey || null,
    };
  } catch (error) {
    console.error('Error fetching properties:', error);
    throw new Error('Could not retrieve properties');
  }
};

export const deleteProperties = async (
  ddbDocClient: DynamoDBDocumentClient,
  propIds: string,
  clientIds: string,
) => {
  const deletedProperties: any[] = [];
  const prop_ids = propIds.split(',').map((id) => id.trim());
  const client_ids = clientIds.split(',').map((id) => id.trim());

  for (let index = 0; index < prop_ids.length; index++) {
    const clientId = client_ids[index];
    const propertyId = prop_ids[index];

    const propertyQuery = {
      TableName: config.tableNames.properties,
      FilterExpression: 'client_id = :client_id AND id = :propId',
      ExpressionAttributeValues: {
        ':client_id': clientId,
        ':propId': propertyId,
      },
    };

    // 論理削除済みを除外してスキャン
    const propertyResult = await scanWithoutDeleted(ddbDocClient, propertyQuery);
    const propertiesToDelete = propertyResult.Items || [];

    for (const property of propertiesToDelete) {
      // S3ファイルの削除は論理削除なので行わない（必要に応じて後で物理削除できる）
      // if (property.s3_path) {
      //   const path = property.s3_path.replace(process.env.AWS_S3_URL || '', '');
      //   console.error('Tracking Path:', path);
      //   await deleteFileFromS3(path);
      // }

      // 論理削除を実行
      await softDeleteDynamo(ddbDocClient, config.tableNames.properties, {
        client_id: property.client_id,
        created_at: property.created_at,
      });

      deletedProperties.push(property);
    }
  }

  return { properties: deletedProperties };
};

// executeBatchDelete関数は論理削除では不要になりますが、
// 既存のコードとの互換性のために残しておきます
export const executeBatchDelete = async (
  ddbDocClient: DynamoDBDocumentClient,
  deleteParams: { RequestItems: { [key: string]: any[] } },
) => {
  try {
    // 論理削除では実際のBatchWriteCommandは実行しません
    console.log('Logical delete mode: BatchWriteCommand skipped');
    console.log('Delete params would have been:', JSON.stringify(deleteParams, null, 2));
  } catch (error) {
    console.error('Error executing batch delete:', error);
    throw error;
  }
};

export const getLastEvaluatedKeyForPage = async (
  ddbDocClient: DynamoDBDocumentClient,
  tableName: string,
  clientId: string,
  limit: number,
  page: number,
): Promise<Record<string, any> | null> => {
  let lastKey: Record<string, any> | undefined = undefined;

  for (let i = 1; i < page; i++) {
    const result: ScanCommandOutput = await scanWithoutDeleted(ddbDocClient, {
        TableName: tableName,
        FilterExpression: 'client_id = :clientId',
        ExpressionAttributeValues: {
          ':clientId': clientId,
        },
        Limit: limit,
        ExclusiveStartKey: lastKey,
      });

    if (!result.LastEvaluatedKey) {
      return null; // Reached end before desired page
    }

    lastKey = result.LastEvaluatedKey;
  }

  return lastKey || null;
};

export const searchPropertiesWithPageNumber = async (
  ddbDocClient: DynamoDBDocumentClient,
  queryParams: PropertySearchParams,
  clientId: string,
  limit: number,
  page: number,
): Promise<any> => {
  const { objectName, registrationRange, prefecture, exclusive_area, price, property_type } =
    queryParams;

  const params: any = {
    TableName: config.tableNames.properties,
    FilterExpression: 'client_id = :clientId',
    ExpressionAttributeValues: {
      ':clientId': clientId,
    },
    Limit: 1000,
  };

  const filterExpressions: string[] = [];

  if (objectName) {
    filterExpressions.push('contains(#name, :objectName)');
    params.ExpressionAttributeNames = {
      ...(params.ExpressionAttributeNames || {}),
      '#name': 'name',
    };
    params.ExpressionAttributeValues[':objectName'] = objectName;
  }

  if (registrationRange) {
    const now = dayjs();
    let startDate: string;
    let endDate: string;

    switch (registrationRange) {
      case '1':
        startDate = now.subtract(1, 'month').startOf('day').toISOString();
        break;
      case '2':
        startDate = now.subtract(2, 'month').startOf('day').toISOString();
        break;
      case '3':
        startDate = now.subtract(3, 'month').startOf('day').toISOString();
        break;
      case '4':
        startDate = now.subtract(6, 'month').startOf('day').toISOString();
        break;
      case '5':
        startDate = now.subtract(1, 'year').startOf('day').toISOString();
        break;
      default:
        startDate = now.subtract(1, 'year').startOf('day').toISOString();
        break;
    }

    endDate = now.endOf('day').toISOString();

    filterExpressions.push('created_at BETWEEN :startDate AND :endDate');
    params.ExpressionAttributeValues[':startDate'] = startDate;
    params.ExpressionAttributeValues[':endDate'] = endDate;
  }

  // prefectureが数字の文字列の場合は都道府県名も含めてOR検索
  if (prefecture) {
    const values = [prefecture];
    if (PREFECTURE_MAPPING[prefecture as PrefectureCode]) {
      values.push(PREFECTURE_MAPPING[prefecture as PrefectureCode]);
    }
    if (values.length === 2) {
      filterExpressions.push('(prefecture = :prefectureNum OR prefecture = :prefectureName)');
      params.ExpressionAttributeValues[':prefectureNum'] = values[0];
      params.ExpressionAttributeValues[':prefectureName'] = values[1];
    } else {
      filterExpressions.push('prefecture = :prefecture');
      params.ExpressionAttributeValues[':prefecture'] = values[0];
    }
  }

  const typeMap: Record<string, string> = {
    '1': '土地',
    '2': 'マンション',
    '3': '新築',
    '4': '指定なし',
  };

  if (property_type && typeMap[property_type] && typeMap[property_type] !== '指定なし') {
    filterExpressions.push('#type = :propertyType');

    // Add the expression attribute name for 'type'
    params.ExpressionAttributeNames = {
      ...(params.ExpressionAttributeNames || {}),
      '#type': 'type',
    };

    params.ExpressionAttributeValues[':propertyType'] = typeMap[property_type];
  }


  let minArea: number | undefined;
  let maxArea: number | undefined;

  if (exclusive_area) {
    const areaRanges: Record<string, [number?, number?]> = {
      '1': [undefined, 30.99],
      '2': [31, 49.99],
      '3': [50, 69.99],
      '4': [70, 89.99],
      '5': [90, 109.99],
      '6': [110, 130],
      '7': [131, undefined],
    };

    [minArea, maxArea] = areaRanges[exclusive_area] || [];
  }


  if (price) {
    const priceRanges: Record<string, [number?, number?]> = {
      '1': [undefined, 5_000_000],
      '2': [5_000_001, 10_000_000],
      '3': [10_000_001, 20_000_000],
      '4': [20_000_001, 30_000_000],
      '5': [30_000_001, 40_000_000],
      '6': [40_000_001, 50_000_000],
      '7': [50_000_001, 70_000_000],
      '8': [70_000_001, 100_000_000],
      '9': [100_000_001, undefined],
    };

    const [minPrice, maxPrice] = priceRanges[price] || [];

    if (minPrice !== undefined && maxPrice !== undefined) {
      filterExpressions.push('price BETWEEN :minPrice AND :maxPrice');
      params.ExpressionAttributeValues[':minPrice'] = minPrice;
      params.ExpressionAttributeValues[':maxPrice'] = maxPrice;
    } else if (minPrice !== undefined) {
      filterExpressions.push('price >= :minPrice');
      params.ExpressionAttributeValues[':minPrice'] = minPrice;
    } else if (maxPrice !== undefined) {
      filterExpressions.push('price <= :maxPrice');
      params.ExpressionAttributeValues[':maxPrice'] = maxPrice;
    }
  }

  if (filterExpressions.length > 0) {
    params.FilterExpression += ' AND ' + filterExpressions.join(' AND ');
  }

  // --- デバッグログ追加 ---
  console.log('=== Debug Info (searchPropertiesWithPageNumber) ===');
  console.log('objectName:', objectName);
  console.log('prefecture:', prefecture);
  console.log('price:', price);
  console.log('property_type:', property_type);
  console.log('registrationRange:', registrationRange);
  console.log('FilterExpression:', params.FilterExpression);
  console.log('ExpressionAttributeValues:', params.ExpressionAttributeValues);
  if (params.ExpressionAttributeNames) {
    console.log('ExpressionAttributeNames:', params.ExpressionAttributeNames);
  }
  console.log('===============================================');

  // Scan all matching results (page size set to 1000)
  const allData = await scanWithoutDeleted(ddbDocClient, params);
  const allItems = allData.Items || [];
  const areaFilteredItems = exclusive_area
    ? allItems.filter((item) => {
      const details = item.details || {};
      const area = details.private_area ?? details.floor_area ?? details.land_area;

      if (area === undefined) return false;

      if (minArea !== undefined && maxArea !== undefined) {
        return area >= minArea && area <= maxArea;
      } else if (minArea !== undefined) {
        return area >= minArea;
      } else if (maxArea !== undefined) {
        return area <= maxArea;
      }
      return true;
    })
    : allItems;

  const total = areaFilteredItems.length;
  const startIndex = (page - 1) * limit;
  const pagedItems = areaFilteredItems.slice(startIndex, startIndex + limit);


  return {
    total,
    page,
    limit,
    items: pagedItems,
  };
};

export const getPropertyInfoByPropertyName = async (
  ddbDocClient: DynamoDBDocumentClient,
  clientId: string,
  propertyName: string,
): Promise<{id: string; client_id: string; created_at: string}> => {
  let ExclusiveStartKey: Record<string, any> | undefined = undefined;

  do {
    const result: ScanCommandOutput = await scanWithoutDeleted(ddbDocClient, {
        TableName: config.tableNames.properties,
        FilterExpression: 'client_id = :clientId AND #name = :propertyName',
        ExpressionAttributeNames: {
          '#name': 'name',
        },
        ExpressionAttributeValues: {
          ':clientId': clientId,
          ':propertyName': propertyName,
        },
        ExclusiveStartKey,
      });

    if (result.Items && result.Items.length > 0) {
      const property = result.Items[0] as Property;
      return {
        id: property.id,
        client_id: property.client_id,
        created_at: property.created_at,
      }

    }

    ExclusiveStartKey = result.LastEvaluatedKey;
  } while (ExclusiveStartKey);

  throw new Error('Property name not found.');
};

export async function isPropertyNameTaken(
  ddbDocClient: DynamoDBDocumentClient,
  client_id: string,
  name: string,
): Promise<boolean> {
  const normalizedName = name.trim().toLowerCase();

  const result = await scanWithoutDeleted(ddbDocClient, {
      TableName: config.tableNames.properties,
      FilterExpression: 'client_id = :clientId AND attribute_exists(#name)',
      ExpressionAttributeNames: {
        '#name': 'name',
      },
      ExpressionAttributeValues: {
        ':clientId': client_id,
      },
    });

  const match = result.Items?.some((item) => {
    const existingName = item.name?.trim().toLowerCase();
    return existingName === normalizedName;
  });

  return match ?? false;
}



export const getAllProperties = async (ddbDocClient: DynamoDBDocumentClient, clientId: string) => {
  try {
    const individualParams = {
      TableName: config.tableNames.properties,
      FilterExpression: 'client_id = :clientId',
      ExpressionAttributeValues: {
        ':clientId': clientId,
      },
    };

    const [individualResult] = await Promise.all([
      scanWithoutDeleted(ddbDocClient, individualParams),
    ]);

    const properties = {
      properties: individualResult.Items || [],
    };

    return properties;
  } catch (error) {
    console.error('Error fetching properties:', error);
    throw new Error('Could not retrieve properties');
  }
};


export const getPropertySummaries = async (
  ddbDocClient: DynamoDBDocumentClient,
  clientId: string
): Promise<{ id: string; name: string }[]> => {
  const params = {
    TableName: config.tableNames.properties,
    KeyConditionExpression: 'client_id = :clientId',
    ProjectionExpression: 'id, #name',
    ExpressionAttributeNames: {
      '#name': 'name',
    },
    ExpressionAttributeValues: {
      ':clientId': clientId,
    },
  };

  const result = await queryWithoutDeleted(ddbDocClient, params);
  return result.Items as { id: string; name: string }[];
};

