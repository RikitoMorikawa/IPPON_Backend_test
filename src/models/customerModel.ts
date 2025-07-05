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
import { Customer } from '@src/interfaces/customerInterfaces';
import { Inquiry } from '@src/types/inquiry';
import dayjs from 'dayjs';
import { ERROR_MESSAGES } from '@src/responses/constants/customerConstants';

export const saveCustomer = async (
  ddbDocClient: DynamoDBDocumentClient,
  customer: Customer,
): Promise<Customer> => {
  const timestamp = new Date().toISOString();
  const params = {
    TableName: config.tableNames.customers,
    Item: {
      ...customer,
      client_id: customer.client_id,
      created_at: timestamp,
      updated_at: timestamp,
    },
  };

  try {
    await ddbDocClient.send(new PutCommand(params));
    return params.Item;
  } catch (error) {
    console.error('Error saving customer to DynamoDB:', error);
    throw error;
  }
};

export const createNewCustomer = (data: any): Customer => {
  const {
    client_id,
    employee_id,
    first_name,
    last_name,
    middle_name,
    first_name_kana,
    middle_name_kana,
    last_name_kana,
    birthday,
    gender,
    mail_address,
    phone_number,
    postcode,
    prefecture,
    city,
    street_address,
    building,
    room_number,
    id_card_front,
    id_card_back,
    id_card_front_path,
    id_card_back_path,
  } = data;

  return {
    client_id,
    employee_id,
    id: uuidv4(),
    first_name,
    last_name,
    middle_name,
    first_name_kana,
    middle_name_kana,
    last_name_kana,
    birthday,
    gender,
    mail_address,
    phone_number,
    postcode,
    prefecture,
    city,
    street_address,
    building,
    room_number,
    id_card_front: id_card_front || id_card_front_path,
    id_card_back: id_card_back || id_card_back_path,
    id_card_front_path: id_card_front_path || id_card_front,
    id_card_back_path: id_card_back_path || id_card_back,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
};

export const getCustomers = async (
  ddbDocClient: DynamoDBDocumentClient,
  clientId: string,
  firstName: string,
  familyName: string,
): Promise<Customer[]> => {
  const customerParams = {
    TableName: config.tableNames.customers,
    FilterExpression: 'client_id = :clientId AND (contains(first_name, :firstName) OR contains(last_name, :familyName) OR contains(middle_name, :familyName))',
    ExpressionAttributeValues: {
      ':clientId': clientId,
      ':firstName': firstName,
      ':familyName': familyName,
    },
  };

  const result = await ddbDocClient.send(new ScanCommand(customerParams));
  return (result.Items as Customer[]) || [];
};

export const deleteCustomers = async (
  ddbDocClient: DynamoDBDocumentClient,
  ids: string[],
): Promise<void> => {
  const deleteRequests = ids.map((id) => ({
    DeleteRequest: {
      Key: { id },
    },
  }));

  const params = {
    RequestItems: {
      Customers: deleteRequests,
    },
  };

  await ddbDocClient.send(new BatchWriteCommand(params));
};

/**
 * Verify that the customer exists in the database
 */
export async function verifyCustomerExists(
  ddbDocClient: any,
  client_id: string,
  created_at: string,
  customer_id: string,
  reply: FastifyReply,
): Promise<boolean> {
  const getCommand = new GetCommand({
    TableName: config.tableNames.customers,
    Key: {
      client_id,
      created_at,
    },
  });

  const existingItem = await ddbDocClient.send(getCommand);

  if (!existingItem.Item || existingItem.Item.id !== customer_id) {
    reply.status(404).send(errorResponse(404, ERROR_MESSAGES.RECORD_NOT_FOUND_ERROR));
    return false;
  }

  return true;
}

/**
 * Execute the DynamoDB update for a customer
 */
export async function executeCustomerUpdate(
  ddbDocClient: any,
  client_id: string,
  created_at: string,
  customer_id: string,
  updates: Record<string, any>,
): Promise<any> {
  const updateExpressions: string[] = [];
  const expressionAttributeValues: Record<string, any> = {
    ':customer_id': customer_id,
  };
  const expressionAttributeNames: Record<string, string> = {
    '#id': 'id',
  };

  Object.entries(updates).forEach(([key, value]) => {
    const attributeKey = `#${key}`;
    const valueKey = `:${key}`;

    updateExpressions.push(`${attributeKey} = ${valueKey}`);
    expressionAttributeValues[valueKey] = value;
    expressionAttributeNames[attributeKey] = key;
  });

  if (updateExpressions.length === 0) {
    throw new Error(ERROR_MESSAGES.NO_VALID_FIELD_ERROR);
  }

  const updateParams: UpdateCommandInput = {
    TableName: config.tableNames.customers,
    Key: {
      client_id,
      created_at,
    },
    ConditionExpression: '#id = :customer_id',
    UpdateExpression: `SET ${updateExpressions.join(', ')}`,
    ExpressionAttributeValues: expressionAttributeValues,
    ExpressionAttributeNames: expressionAttributeNames,
    ReturnValues: 'ALL_NEW',
  };

  return ddbDocClient.send(new UpdateCommand(updateParams));
}

export const searchCustomerAndInquiry = async (
  ddbDocClient: DynamoDBDocumentClient,
  clientId: string,
  firstName: string,
  familyName: string,
  inquiryTimestamp?: string,
  inquiryMethod?: string,
  employeeName?: string,
) => {
  let customers: any[] = [];
  let inquiries: any[] = [];

  const customerFilterExpressions: string[] = [];
  const customerExprAttrValues: Record<string, string> = {};

  customerFilterExpressions.push('client_id = :clientId');
  customerExprAttrValues[':clientId'] = clientId;

  if (firstName) {
    customerFilterExpressions.push('contains(first_name, :firstName)');
    customerExprAttrValues[':firstName'] = firstName;
  }

  if (familyName) {
    customerFilterExpressions.push(
      '(contains(last_name, :familyName) OR contains(middle_name, :familyName))',
    );
    customerExprAttrValues[':familyName'] = familyName;
  }

  const customerParams = {
    TableName: config.tableNames.customers,
    FilterExpression: customerFilterExpressions.join(' AND '),
    ExpressionAttributeValues: customerExprAttrValues,
  };
  const customerResult = await ddbDocClient.send(new ScanCommand(customerParams));
  customers = customerResult.Items || [];

  const customerIds = customers.map((c) => c.id);

  const inquiryFilterExpressions: string[] = [];
  const inquiryExprAttrValues: Record<string, any> = {};

  inquiryFilterExpressions.push('client_id = :clientId');
  inquiryExprAttrValues[':clientId'] = clientId;

  if (inquiryMethod) {
    inquiryFilterExpressions.push('method = :method');
    inquiryExprAttrValues[':method'] = inquiryMethod;
  }

  if (inquiryTimestamp) {
    const now = dayjs();
    let startDate: string;
    let endDate: string;

    switch (inquiryTimestamp) {
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

    inquiryFilterExpressions.push('inquired_at BETWEEN :startDate AND :endDate');
    inquiryExprAttrValues[':startDate'] = startDate;
    inquiryExprAttrValues[':endDate'] = endDate;
  }

  if (customerIds.length > 0) {
    inquiryFilterExpressions.push(
      `(${customerIds.map((_, i) => `customer_id = :id${i}`).join(' OR ')})`,
    );
    customerIds.forEach((id, i) => {
      inquiryExprAttrValues[`:id${i}`] = id;
    });
  }

  const inquiryParams = {
    TableName: config.tableNames.inquiry,
    FilterExpression: inquiryFilterExpressions.join(' AND '),
    ExpressionAttributeValues: inquiryExprAttrValues,
  };
  const inquiryResult = await ddbDocClient.send(new ScanCommand(inquiryParams));
  inquiries = inquiryResult.Items || [];

  const result = customers.map((customer) => {
    const inquiry = inquiries.find((i) => i.customer_id === customer.id);
    return {
      customer,
      inquiry: inquiry || null,
    };
  });

  return {
    customers: result.map((r) => r.customer),
    inquiries: result.map((r) => r.inquiry),
  };
};

export const fetchIndividualCustomer = async (
  ddbDocClient: DynamoDBDocumentClient,
  id: string,
  clientId: string,
) => {
  const params = {
    TableName: config.tableNames.customers,
    FilterExpression: 'id = :id AND client_id = :clientId',
    ExpressionAttributeValues: {
      ':id': id,
      ':clientId': clientId,
    },
  };

  const result = await ddbDocClient.send(new ScanCommand(params));
  return result.Items && result.Items.length > 0 ? result.Items[0] : null;
};

export const getAllCustomers = async (ddbDocClient: DynamoDBDocumentClient, clientId: string) => {
  try {
    const individualParams = {
      TableName: config.tableNames.customers,
      FilterExpression: 'client_id = :clientId',
      ExpressionAttributeValues: {
        ':clientId': clientId,
      },
    };

    const [individualResult] = await Promise.all([
      ddbDocClient.send(new ScanCommand(individualParams)),
    ]);

    const customers = {
      customers: individualResult.Items || [],
    };

    return customers;
  } catch (error) {
    console.error('Error fetching customers:', error);
    throw new Error('Could not retrieve customers');
  }
};

export const saveCustomerAndInquiry = async (
  ddbDocClient: DynamoDBDocumentClient,
  customer: Customer,
  inquiry: Inquiry,
): Promise<void> => {
  const timestamp = new Date().toISOString();
 // const test_timestamp = '2025-05-25T09:19:38.744Z';

  const command = new TransactWriteCommand({
    TransactItems: [
      {
        Put: {
          TableName: config.tableNames.customers,
          Item: {
            ...customer,
            created_at: timestamp,
            updated_at: timestamp,
          },
        },
      },
      {
        Put: {
          TableName: config.tableNames.inquiry,
          Item: {
            ...inquiry,
            created_at: timestamp,
            updated_at: timestamp,
          },
        },
      },
    ],
  });

  await ddbDocClient.send(command);
};


interface DeleteMultipleCustomersInput {
  ddbDocClient: DynamoDBDocumentClient;
  clientId: string;
  customerIds: string[];
}

interface DeleteResult {
  customersDeleted: number;
  inquiriesDeleted: number;
  notFoundCustomerIds: string[];
  errors: string[];
}

export const deleteMultipleCustomersAndInquiries = async ({
  ddbDocClient,
  clientId,
  customerIds,
}: DeleteMultipleCustomersInput): Promise<DeleteResult> => {
  const results: DeleteResult = {
    customersDeleted: 0,
    inquiriesDeleted: 0,
    notFoundCustomerIds: [],
    errors: [],
  };

  try {
    const [customerRes, inquiryRes] = await Promise.all([
      ddbDocClient.send(
        new QueryCommand({
          TableName: config.tableNames.customers,
          KeyConditionExpression: 'client_id = :cid',
          ExpressionAttributeValues: { ':cid': clientId },
        }),
      ),
      ddbDocClient.send(
        new QueryCommand({
          TableName: config.tableNames.inquiry,
          KeyConditionExpression: 'client_id = :cid',
          ExpressionAttributeValues: { ':cid': clientId },
        }),
      ),
    ]);

    const customersToDelete = (customerRes.Items ?? []).filter((item) =>
      customerIds.includes(item.id),
    );

    const inquiriesToDelete = (inquiryRes.Items ?? []).filter((item) =>
      customerIds.includes(item.customer_id),
    );

    const foundCustomerIds = customersToDelete.map((customer) => customer.id);
    results.notFoundCustomerIds = customerIds.filter((id) => !foundCustomerIds.includes(id));

    if (results.notFoundCustomerIds.length > 0) {
      console.warn(`Customer IDs not found: ${results.notFoundCustomerIds.join(', ')}`);
    }

    if (customersToDelete.length === 0) {
      console.log('No customers found to delete');
      return results;
    }

    const batchDelete = async (tableName: string, items: any[]) => {
      if (items.length === 0) return 0;

      let deletedCount = 0;

      for (let i = 0; i < items.length; i += 25) {
        const batch = items.slice(i, i + 25);

        try {
          const response = await ddbDocClient.send(
            new BatchWriteCommand({
              RequestItems: {
                [tableName]: batch.map((item) => ({
                  DeleteRequest: {
                    Key: {
                      client_id: clientId,
                      created_at: item.created_at,
                    },
                  },
                })),
              },
            }),
          );

          deletedCount += batch.length;

          if (response.UnprocessedItems && response.UnprocessedItems[tableName]) {
            const unprocessedCount = response.UnprocessedItems[tableName].length;
            results.errors.push(`${unprocessedCount} items from ${tableName} were not processed`);
          }
        } catch (error) {
          results.errors.push(`Failed to delete batch from ${tableName}: ${error}`);
        }
      }

      return deletedCount;
    };

    const [customersDeleted, inquiriesDeleted] = await Promise.all([
      batchDelete(config.tableNames.customers, customersToDelete),
      batchDelete(config.tableNames.inquiry, inquiriesToDelete),
    ]);

    results.customersDeleted = customersDeleted;
    results.inquiriesDeleted = inquiriesDeleted;

    console.log(
      `Successfully deleted ${customersDeleted} customers and ${inquiriesDeleted} inquiries`,
    );

    if (results.errors.length > 0) {
      console.warn('Some errors occurred during deletion:', results.errors);
    }

    return results;
  } catch (error) {
    console.error('Error in bulk delete operation:', error);
    throw error;
  }
};

export const deleteMultipleCustomersAndInquiriesStrict = async ({
  ddbDocClient,
  clientId,
  customerIds,
}: DeleteMultipleCustomersInput) => {
  try {
    const customerRes = await ddbDocClient.send(
      new QueryCommand({
        TableName: config.tableNames.customers,
        KeyConditionExpression: 'client_id = :cid',
        ExpressionAttributeValues: { ':cid': clientId },
      }),
    );

    const existingCustomers = customerRes.Items ?? [];
    const existingCustomerIds = existingCustomers.map((customer) => customer.id);
    const notFoundIds = customerIds.filter((id) => !existingCustomerIds.includes(id));

    if (notFoundIds.length > 0) {
      throw new Error(`Customer IDs not found: ${notFoundIds.join(', ')}`);
    }

    const customersToDelete = existingCustomers.filter((item) => customerIds.includes(item.id));

    const inquiryRes = await ddbDocClient.send(
      new QueryCommand({
        TableName: config.tableNames.inquiry,
        KeyConditionExpression: 'client_id = :cid',
        ExpressionAttributeValues: { ':cid': clientId },
      }),
    );

    const inquiriesToDelete = (inquiryRes.Items ?? []).filter((item) =>
      customerIds.includes(item.customer_id),
    );
  } catch (error) {
    throw error;
  }
};



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