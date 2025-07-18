import { FastifyReply } from 'fastify';
import {
  DynamoDBDocumentClient,
  ScanCommand,
  BatchWriteCommand,
  GetCommand,
  PutCommand,
  UpdateCommand,
  UpdateCommandInput,
  TransactWriteCommand,
  QueryCommand,
} from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import config from '@src/config';
import { errorResponse } from '@src/responses';
import { CustomerDetail, IndividualCustomerDetail, CorporateCustomerDetail } from '@src/models/customerType';
import { CustomerType, CUSTOMER_TYPES } from '@src/enums/customerEnums';
import { CreateCustomerRequest, UpdateCustomerRequest } from '@src/interfaces/customerInterfaces';
import { Inquiry } from '@src/models/inquiryType';
import dayjs from 'dayjs';
import { ERROR_MESSAGES } from '@src/responses/constants/customerConstants';
import { scanWithoutDeleted, queryWithoutDeleted, softDeleteDynamo } from '@src/utils/softDelete';

// ============================================
// 顧客作成・保存関連
// ============================================

export const saveCustomerDetail = async (
  ddbDocClient: DynamoDBDocumentClient,
  customerDetail: CustomerDetail,
): Promise<CustomerDetail> => {
  const timestamp = new Date().toISOString();
  const params = {
    TableName: config.tableNames.customers,
    Item: {
      ...customerDetail,
      created_at: customerDetail.created_at || timestamp,
      updated_at: timestamp,
    },
  };

  try {
    await ddbDocClient.send(new PutCommand(params));
    return params.Item as CustomerDetail;
  } catch (error) {
    console.error('Error saving customer detail to DynamoDB:', error);
    throw error;
  }
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
  if (data.customer_type === CUSTOMER_TYPES.INDIVIDUAL_CUSTOMER && data.individual_customer_details) {
    customerDetail.individual_customer_details = data.individual_customer_details;
  }

  // 法人顧客の場合
  if (data.customer_type === CUSTOMER_TYPES.CORPORATE_CUSTOMER && data.corporate_customer_details) {
    customerDetail.corporate_customer_details = data.corporate_customer_details;
  }

  return customerDetail;
};

// ============================================
// 顧客取得関連
// ============================================

export const getCustomerDetails = async (
  ddbDocClient: DynamoDBDocumentClient,
  clientId: string,
  customerType?: CustomerType,
  searchName?: string,
): Promise<CustomerDetail[]> => {
  const filterExpressions: string[] = [];
  const expressionAttributeValues: Record<string, any> = {};

  filterExpressions.push('client_id = :clientId');
  expressionAttributeValues[':clientId'] = clientId;

  // 顧客タイプでフィルタリング
  if (customerType) {
    filterExpressions.push('customer_type = :customerType');
    expressionAttributeValues[':customerType'] = customerType;
  }

  // 名前での検索（個人顧客の場合）
  if (searchName) {
    filterExpressions.push(
      '(contains(individual_customer_details.first_name, :searchName) OR ' +
      'contains(individual_customer_details.last_name, :searchName) OR ' +
      'contains(corporate_customer_details.corporate_name, :searchName))'
    );
    expressionAttributeValues[':searchName'] = searchName;
  }

  const customerParams = {
    TableName: config.tableNames.customers,
    FilterExpression: filterExpressions.join(' AND '),
    ExpressionAttributeValues: expressionAttributeValues,
  };

  try {
    const customerResult = await scanWithoutDeleted(ddbDocClient, customerParams);
    return (customerResult.Items as CustomerDetail[]) || [];
  } catch (error) {
    console.error('Error fetching customer details:', error);
    throw error;
  }
};

export const getCustomerDetailById = async (
  ddbDocClient: DynamoDBDocumentClient,
  clientId: string,
  customerId: string,
): Promise<CustomerDetail | null> => {
  const params = {
    TableName: config.tableNames.customers,
    FilterExpression: 'client_id = :clientId AND id = :customerId',
    ExpressionAttributeValues: {
      ':clientId': clientId,
      ':customerId': customerId,
    },
  };

  try {
    const result = await scanWithoutDeleted(ddbDocClient, params);
    return result.Items?.[0] as CustomerDetail || null;
  } catch (error) {
    console.error('Error fetching customer detail by ID:', error);
    throw error;
  }
};

export const getAllCustomerDetails = async (
  ddbDocClient: DynamoDBDocumentClient,
  clientId: string,
): Promise<{ customers: CustomerDetail[] }> => {
  const params = {
    TableName: config.tableNames.customers,
    KeyConditionExpression: 'client_id = :clientId',
    ExpressionAttributeValues: {
      ':clientId': clientId,
    },
  };

  try {
    const result = await queryWithoutDeleted(ddbDocClient, params);
    return { customers: (result.Items as CustomerDetail[]) || [] };
  } catch (error) {
    console.error('Error fetching all customer details:', error);
    throw error;
  }
};

export const fetchIndividualCustomerDetail = async (
  ddbDocClient: DynamoDBDocumentClient,
  customerId: string,
  clientId: string,
): Promise<CustomerDetail | null> => {
  const params = {
    TableName: config.tableNames.customers,
    FilterExpression: 'client_id = :clientId AND id = :customerId AND customer_type = :customerType',
    ExpressionAttributeValues: {
      ':clientId': clientId,
      ':customerId': customerId,
      ':customerType': CUSTOMER_TYPES.INDIVIDUAL_CUSTOMER,
    },
  };

  try {
    const result = await scanWithoutDeleted(ddbDocClient, params);
    return result.Items?.[0] as CustomerDetail || null;
  } catch (error) {
    console.error('Error fetching individual customer detail:', error);
    throw error;
  }
};

export const fetchCorporateCustomerDetail = async (
  ddbDocClient: DynamoDBDocumentClient,
  customerId: string,
  clientId: string,
): Promise<CustomerDetail | null> => {
  const params = {
    TableName: config.tableNames.customers,
    FilterExpression: 'client_id = :clientId AND id = :customerId AND customer_type = :customerType',
    ExpressionAttributeValues: {
      ':clientId': clientId,
      ':customerId': customerId,
      ':customerType': CUSTOMER_TYPES.CORPORATE_CUSTOMER,
    },
  };

  try {
    const result = await scanWithoutDeleted(ddbDocClient, params);
    return result.Items?.[0] as CustomerDetail || null;
  } catch (error) {
    console.error('Error fetching corporate customer detail:', error);
    throw error;
  }
};

// ============================================
// 顧客更新関連
// ============================================

export const verifyCustomerDetailExists = async (
  ddbDocClient: DynamoDBDocumentClient,
  clientId: string,
  createdAt: string,
  customerId: string,
  reply: FastifyReply,
): Promise<CustomerDetail | null> => {
  const params = {
    TableName: config.tableNames.customers,
    Key: {
      client_id: clientId,
      created_at: createdAt,
    },
  };

  try {
    const result = await ddbDocClient.send(new GetCommand(params));
    const item = result.Item as CustomerDetail;
    
    if (!item || item.id !== customerId) {
      return null;
    }
    
    return item;
  } catch (error) {
    console.error('Error verifying customer detail exists:', error);
    reply.status(500).send(errorResponse(500, ERROR_MESSAGES.SERVER_ERROR));
    return null;
  }
};

export const executeCustomerDetailUpdate = async (
  ddbDocClient: DynamoDBDocumentClient,
  clientId: string,
  createdAt: string,
  customerId: string,
  updates: Partial<CustomerDetail>,
): Promise<any> => {
  const updateExpressions: string[] = [];
  const expressionAttributeValues: Record<string, any> = {};
  const expressionAttributeNames: Record<string, string> = {};

  Object.keys(updates).forEach((key, index) => {
    if (key === 'updated_at') {
      updateExpressions.push(`#${key} = :val${index}`);
      expressionAttributeNames[`#${key}`] = key;
      expressionAttributeValues[`:val${index}`] = updates[key as keyof CustomerDetail];
    } else if (key === 'individual_customer_details' && updates.individual_customer_details) {
      updateExpressions.push(`#${key} = :val${index}`);
      expressionAttributeNames[`#${key}`] = key;
      expressionAttributeValues[`:val${index}`] = updates.individual_customer_details;
    } else if (key === 'corporate_customer_details' && updates.corporate_customer_details) {
      updateExpressions.push(`#${key} = :val${index}`);
      expressionAttributeNames[`#${key}`] = key;
      expressionAttributeValues[`:val${index}`] = updates.corporate_customer_details;
    } else if (key === 'employee_id' || key === 'property_ids') {
      updateExpressions.push(`#${key} = :val${index}`);
      expressionAttributeNames[`#${key}`] = key;
      expressionAttributeValues[`:val${index}`] = updates[key as keyof CustomerDetail];
    }
  });

  if (updateExpressions.length === 0) {
    throw new Error('No valid fields to update');
  }

  const params: UpdateCommandInput = {
    TableName: config.tableNames.customers,
    Key: {
      client_id: clientId,
      created_at: createdAt,
    },
    UpdateExpression: 'SET ' + updateExpressions.join(', '),
    ExpressionAttributeNames: expressionAttributeNames,
    ExpressionAttributeValues: expressionAttributeValues,
    ReturnValues: 'ALL_NEW',
  };

  try {
    const result = await ddbDocClient.send(new UpdateCommand(params));
    return result;
  } catch (error) {
    console.error('Error updating customer detail:', error);
    throw error;
  }
};

// ============================================
// 顧客削除関連
// ============================================

export const deleteCustomerDetails = async (
  ddbDocClient: DynamoDBDocumentClient,
  ids: string[],
  clientId: string,
): Promise<void> => {
  const params = {
    TableName: config.tableNames.customers,
    FilterExpression: 'client_id = :clientId',
    ExpressionAttributeValues: {
      ':clientId': clientId,
    },
  };

  try {
    const result = await scanWithoutDeleted(ddbDocClient, params);
    const customersToDelete = result.Items?.filter((item) => ids.includes(item.id));

    if (customersToDelete && customersToDelete.length > 0) {
      await Promise.all(
                 customersToDelete.map(async (customer) => {
           await softDeleteDynamo(
             ddbDocClient,
             config.tableNames.customers,
             { client_id: customer.client_id, created_at: customer.created_at }
           );
         })
      );
    }
  } catch (error) {
    console.error('Error deleting customer details:', error);
    throw error;
  }
};

// ============================================
// 顧客・問い合わせ同時操作関連
// ============================================

export const saveCustomerDetailAndInquiry = async (
  ddbDocClient: DynamoDBDocumentClient,
  customerDetail: CustomerDetail,
  inquiry: Inquiry,
): Promise<void> => {
  const transactItems = [
    {
      Put: {
        TableName: config.tableNames.customers,
        Item: customerDetail,
      },
    },
    {
      Put: {
        TableName: config.tableNames.inquiry,
        Item: inquiry,
      },
    },
  ];

  try {
    await ddbDocClient.send(new TransactWriteCommand({ TransactItems: transactItems }));
  } catch (error) {
    console.error('Error saving customer detail and inquiry:', error);
    throw error;
  }
};

interface DeleteMultipleCustomersInput {
  ddbDocClient: DynamoDBDocumentClient;
  clientId: string;
  customerIds: string[];
}

interface DeleteMultipleCustomersResult {
  customersDeleted: number;
  inquiriesDeleted: number;
  notFoundCustomerIds: string[];
  errors: string[];
}

export const deleteMultipleCustomerDetailsAndInquiries = async ({
  ddbDocClient,
  clientId,
  customerIds,
}: DeleteMultipleCustomersInput): Promise<DeleteMultipleCustomersResult> => {
  const results: DeleteMultipleCustomersResult = {
    customersDeleted: 0,
    inquiriesDeleted: 0,
    notFoundCustomerIds: [],
    errors: [],
  };

  try {
    // 顧客の存在確認
    const customerRes = await queryWithoutDeleted(ddbDocClient, {
      TableName: config.tableNames.customers,
      KeyConditionExpression: 'client_id = :cid',
      ExpressionAttributeValues: { ':cid': clientId },
    });

    const existingCustomers = (customerRes.Items as CustomerDetail[]) ?? [];
    const existingCustomerIds = existingCustomers.map((customer) => customer.id);

    // 存在しない顧客IDを特定
    customerIds.forEach((id) => {
      if (!existingCustomerIds.includes(id)) {
        results.notFoundCustomerIds.push(id);
      }
    });

    const customersToDelete = existingCustomers.filter((item) => customerIds.includes(item.id));

    // 関連する問い合わせの取得
    const inquiryRes = await queryWithoutDeleted(ddbDocClient, {
      TableName: config.tableNames.inquiry,
      KeyConditionExpression: 'client_id = :cid',
      ExpressionAttributeValues: { ':cid': clientId },
    });

    const inquiriesToDelete = (inquiryRes.Items ?? []).filter((item) =>
      customerIds.includes(item.customer_id),
    );

         // 顧客の削除
     for (const customer of customersToDelete) {
       try {
         await softDeleteDynamo(
           ddbDocClient,
           config.tableNames.customers,
           { client_id: customer.client_id, created_at: customer.created_at }
         );
         results.customersDeleted++;
       } catch (error) {
         results.errors.push(`Failed to delete customer ${customer.id}: ${error}`);
       }
     }

     // 問い合わせの削除
     for (const inquiry of inquiriesToDelete) {
       try {
         await softDeleteDynamo(
           ddbDocClient,
           config.tableNames.inquiry,
           { client_id: inquiry.client_id, created_at: inquiry.created_at }
         );
         results.inquiriesDeleted++;
       } catch (error) {
         results.errors.push(`Failed to delete inquiry ${inquiry.id}: ${error}`);
       }
     }

    return results;
  } catch (error) {
    console.error('Error in bulk delete operation:', error);
    throw error;
  }
};

// ============================================
// 物件問い合わせ数更新
// ============================================

export const incrementPropertyInquiryCount = async (
  ddbDocClient: DynamoDBDocumentClient,
  clientId: string,
  createdAt: string,
): Promise<void> => {
  try {
    // まず現在の値を取得
    const getCommand = new GetCommand({
      TableName: config.tableNames.properties,
      Key: {
        client_id: clientId,
        created_at: createdAt,
      },
    });
    
    const result = await ddbDocClient.send(getCommand);
    
    if (!result.Item) {
      console.error(`Property not found for client_id: ${clientId}, created_at: ${createdAt}`);
      throw new Error('Property not found');
    }
    
    const currentCount = result.Item.inquiry_count || 0;
    
    // SET オペレーションを使用して安全に更新
    await ddbDocClient.send(
      new UpdateCommand({
        TableName: config.tableNames.properties,
        Key: {
          client_id: clientId,
          created_at: createdAt,
        },
        UpdateExpression: 'SET inquiry_count = :newCount',
        ExpressionAttributeValues: {
          ':newCount': currentCount + 1,
        },
      }),
    );
    
    console.log(`Successfully incremented inquiry_count from ${currentCount} to ${currentCount + 1}`);
  } catch (error) {
    console.error('Error incrementing property inquiry count:', error);
    throw new Error('Failed to update property inquiry count');
  }
};

// ============================================
// 検索・フィルタリング関連
// ============================================

export const searchCustomerDetailAndInquiry = async (
  ddbDocClient: DynamoDBDocumentClient,
  clientId: string,
  searchParams: {
    customerType?: CustomerType;
    employeeId?: string;
    searchName?: string;
    propertyId?: string;
  },
): Promise<{
  customers: CustomerDetail[];
  inquiries: Inquiry[];
}> => {
  try {
    const customers = await getCustomerDetails(
      ddbDocClient,
      clientId,
      searchParams.customerType,
      searchParams.searchName,
    );

    // 従業員IDでフィルタリング
    const filteredCustomers = searchParams.employeeId
      ? customers.filter((customer) => customer.employee_id === searchParams.employeeId)
      : customers;

    // 関連する問い合わせを取得
    const inquiryRes = await queryWithoutDeleted(ddbDocClient, {
      TableName: config.tableNames.inquiry,
      KeyConditionExpression: 'client_id = :cid',
      ExpressionAttributeValues: { ':cid': clientId },
    });

    const inquiries = (inquiryRes.Items as Inquiry[]) || [];

    return {
      customers: filteredCustomers,
      inquiries,
    };
  } catch (error) {
    console.error('Error searching customer details and inquiries:', error);
    throw error;
  }
};