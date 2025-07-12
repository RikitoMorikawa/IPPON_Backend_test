import { Inquiry } from '@src/models/inquiryType';
import { v4 as uuidv4 } from 'uuid';
import {
  UpdateCommand,
  UpdateCommandInput,
  GetCommand,
  ScanCommand,
  DynamoDBDocumentClient,
} from '@aws-sdk/lib-dynamodb';
import config from '@src/config';
import dayjs from 'dayjs';
import { TransactWriteCommand } from '@aws-sdk/lib-dynamodb';
import { scanWithoutDeleted } from '@src/utils/softDelete';


export const saveInquiry = async (
  ddbDocClient: DynamoDBDocumentClient,
  inquiry: Inquiry,
): Promise<void> => {
  const timestamp = new Date().toISOString();

  const command = new TransactWriteCommand({
    TransactItems: [
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

export const createNewInquiry = (data: any): Inquiry => {
  return {
    id: uuidv4(),
    client_id: data.client_id,
    customer_id: data.customer_id,
    property_id: data.property_id,
    employee_id: data.employee_id,
    inquired_at: data.inquired_at || new Date().toISOString(),
    title: data.title,
    category: data.category,
    type: data.type,
    method: data.method,
    summary: data.summary,
    created_at: data.created_at || new Date().toISOString(),
    updated_at: data.updated_at,
    deleted_at: data.deleted_at,
  };
};

export async function executeInquiryUpdate(
  ddbDocClient: any,
  client_id: string,
  inquired_at: string,
  updates: Record<string, any>,
): Promise<any> {
  console.log('Updating inquiry with keys:', { client_id, inquired_at });
  console.log('Inquiry updates:', updates);

  const updateExpressions: string[] = [];
  const expressionAttributeValues: Record<string, any> = {};
  const expressionAttributeNames: Record<string, string> = {};

  for (const [key, value] of Object.entries(updates)) {
    const attrKey = `#${key}`;
    const valKey = `:${key}`;
    updateExpressions.push(`${attrKey} = ${valKey}`);
    expressionAttributeNames[attrKey] = key;
    expressionAttributeValues[valKey] = value;
  }

  const updateParams: UpdateCommandInput = {
    TableName: config.tableNames.inquiry,
    Key: {
      client_id,
      inquired_at,
    },
    UpdateExpression: `SET ${updateExpressions.join(', ')}`,
    ExpressionAttributeValues: expressionAttributeValues,
    ExpressionAttributeNames: expressionAttributeNames,
    ReturnValues: 'ALL_NEW',
  };

  try {
    const result = await ddbDocClient.send(new UpdateCommand(updateParams));
    console.log('Inquiry update successful:', result);
    return result;
  } catch (error: any) {
    console.error('Failed to update inquiry:', error.name, error.message);
    throw new Error('Inquiry update failed');
  }
}

export async function verifyInquiryExists(
  ddbDocClient: any,
  client_id: string,
  inquired_at: string,
): Promise<boolean> {
  const getCommand = new GetCommand({
    TableName: config.tableNames.inquiry,
    Key: {
      client_id,
      inquired_at,
    },
  });

  try {
    const result = await ddbDocClient.send(getCommand);

    if (!result.Item) {
      console.warn('Inquiry not found for key:', { client_id, inquired_at });
      return false;
    }

    return true;
  } catch (err) {
    console.error('Error checking inquiry existence:', err);
    return false;
  }
}

export const getAllInquires = async (ddbDocClient: DynamoDBDocumentClient, clientId: string) => {
  try {
    const individualParams = {
      TableName: config.tableNames.inquiry,
      FilterExpression: 'client_id = :clientId AND #title = :newTitle',
      ExpressionAttributeNames: {
        '#title': 'title',
      },
      ExpressionAttributeValues: {
        ':clientId': clientId,
        ':newTitle': '新規問い合わせ',
      },
    };

    const [individualResult] = await Promise.all([
      scanWithoutDeleted(ddbDocClient, individualParams),
    ]);

    const inquires = {
      inquires: individualResult.Items || [],
    };
    return inquires;
  } catch (error) {
    console.error('Error fetching inquires:', error);
    throw new Error('Could not retrieve inquires');
  }
};

export const getAllInquiryHistory = async (ddbDocClient: DynamoDBDocumentClient, clientId: string) => {
  try {
    const individualParams = {
      TableName: config.tableNames.inquiry,
      FilterExpression: 'client_id = :clientId AND #title <> :newTitle',
      ExpressionAttributeNames: {
        '#title': 'title',
      },
      ExpressionAttributeValues: {
        ':clientId': clientId,
        ':newTitle': '新規問い合わせ',
      },
    };

    const [individualResult] = await Promise.all([
      scanWithoutDeleted(ddbDocClient, individualParams),
    ]);

    const inquires = {
      inquires: individualResult.Items || [],
    };
    return inquires;
  } catch (error) {
    console.error('Error fetching inquires:', error);
    throw new Error('Could not retrieve inquires');
  }
};

export const showInquiryDetails = async (
  ddbDocClient: DynamoDBDocumentClient,
  id: string,
  clientId: string,
) => {
  const params = {
    TableName: config.tableNames.inquiry,
    FilterExpression: 'customer_id = :id AND client_id = :clientId',
    ExpressionAttributeValues: {
      ':id': id,
      ':clientId': clientId,
    },
  };

  const result = await scanWithoutDeleted(ddbDocClient, params);
  return result.Items && result.Items.length > 0 ? result.Items[0] : null;
};





export const searchInquiryByProperty = async (
  ddbDocClient: DynamoDBDocumentClient,
  clientId: string,
  limit: number,
  page: number,
  propertyId: string,
  startDate: string,
  endDate: string,
  inquiryId: string,
  inquiryMethod: string,
) => {
  try {
    console.log('searchInquiryByProperty called with:', { clientId, limit, page });
    page = Number.isNaN(page) || page < 1 ? 1 : page;
    limit = Number.isNaN(limit) || limit < 1 ? 10 : limit;

    let customers: any[] = [];
    let inquiries: any[] = [];
    let properties: any[] = [];

    // 顧客をclient_idでフィルタリング
    const customerFilterExpressions: string[] = ['client_id = :clientId'];
    const customerExprAttrValues: Record<string, string> = {
      ':clientId': clientId
    };
    
    console.log('Customer filter:', customerFilterExpressions.join(' AND '));
    console.log('Customer values:', customerExprAttrValues);

    const result = await scanWithoutDeleted(ddbDocClient, {
      TableName: config.tableNames.customers,
      FilterExpression: customerFilterExpressions.join(' AND '),
      ExpressionAttributeValues: customerExprAttrValues
    });
    customers = result.Items || [];
    
    console.log('Found customers:', customers.length);

    const customerIds = customers.map(c => c.id);
    console.log('Customer IDs:', customerIds);

    if (customerIds.length === 0 && !propertyId) {
      console.log('No matching customers found, returning empty result');
      return {
        total: 0,
        page,
        limit,
        items: []
      };
    }
    // ===  Filter Inquiries ===
    const inquiryFilterExpressions: string[] = ['client_id = :clientId'];  // client_idフィルタを追加
    const inquiryExprAttrValues: Record<string, any> = {
      ':clientId': clientId
    };
    const inquiryExprAttrNames: Record<string, string> = {};

    if (startDate && endDate) {
      inquiryFilterExpressions.push('inquired_at BETWEEN :startDate AND :endDate');
      inquiryExprAttrValues[':startDate'] = startDate;
      inquiryExprAttrValues[':endDate'] = endDate;
    } else if (startDate) {
      inquiryFilterExpressions.push('inquired_at >= :startDate');
      inquiryExprAttrValues[':startDate'] = startDate;
    } else if (endDate) {
      inquiryFilterExpressions.push('inquired_at <= :endDate');
      inquiryExprAttrValues[':endDate'] = endDate;
    }


    if (inquiryId) {
      inquiryFilterExpressions.push('#id = :inquiryId');
      inquiryExprAttrValues[':inquiryId'] = inquiryId;
      inquiryExprAttrNames['#id'] = 'id';
    }


    if (inquiryMethod) {
      inquiryFilterExpressions.push('#method = :method');
      inquiryExprAttrValues[':method'] = inquiryMethod;
      inquiryExprAttrNames['#method'] = 'method';
    }

    if (propertyId) {
      inquiryFilterExpressions.push('#property_id = :propertyid');
      inquiryExprAttrValues[':propertyid'] = propertyId;
      inquiryExprAttrNames['#property_id'] = 'property_id';
    }




    if (inquiryFilterExpressions.length > 0 && Object.keys(inquiryExprAttrValues).length > 0) {
      const inquiryScanInput: any = {
        TableName: config.tableNames.inquiry,
        FilterExpression: inquiryFilterExpressions.join(' AND '),
        ExpressionAttributeValues: inquiryExprAttrValues
      };

      if (Object.keys(inquiryExprAttrNames).length > 0) {
        inquiryScanInput.ExpressionAttributeNames = inquiryExprAttrNames;
      }

      console.log("Inquiry filters:", inquiryScanInput.FilterExpression);
      console.log("Inquiry values:", inquiryScanInput.ExpressionAttributeValues);

      const result = await scanWithoutDeleted(ddbDocClient, inquiryScanInput);
      inquiries = result.Items || [];
    } else {

      const result = await scanWithoutDeleted(ddbDocClient, {
        TableName: config.tableNames.inquiry
      });
      const allInquiries = result.Items || [];
      inquiries = allInquiries;
    }

    console.log('Found inquiries:', inquiries.length);



    // === 3. Load Properties ===
    const propertyIds = [...new Set(inquiries.map(i => i.property_id))];
    console.log('Property IDs:', propertyIds);

    if (propertyIds.length > 0) {
      const filterExpr = `client_id = :clientId AND (${propertyIds.map((_, i) => `id = :pid${i}`).join(' OR ')})`;
      const exprValues: Record<string, any> = {
        ':clientId': clientId  // client_idフィルタを追加
      };
      propertyIds.forEach((id, i) => {
        exprValues[`:pid${i}`] = id;
      });

      const result = await scanWithoutDeleted(ddbDocClient, {
        TableName: config.tableNames.properties,
        FilterExpression: filterExpr,
        ExpressionAttributeValues: exprValues
      });
      properties = result.Items || [];
    }

    console.log('Found properties:', properties.length);

    // === 4. Join Data ===
    const combined = inquiries.map(inquiry => {
      const customer = customers.find(c => c.id === inquiry.customer_id);
      const property = properties.find(p => p.id === inquiry.property_id);
      return {
        inquiry: {
          ...inquiry,
          customer: customer || null,
          property: property || null
        }
      };
    });

    // === 5. Pagination ===
    const total = combined.length;
    const startIndex = (page - 1) * limit;
    const pagedItems = combined.slice(startIndex, startIndex + limit);

    console.log('Final result:', { total, page, limit, items: pagedItems.length });

    return {
      total,
      page,
      limit,
      items: pagedItems
    };

  } catch (error) {
    console.error('Error in searchDashboard:', error);
    throw error;
  }
};



export const searchInquiryHistoryDetails = async (
  ddbDocClient: DynamoDBDocumentClient,
  inquiryId: string,
  title: string,
  clientId: string,  // 必須パラメータに変更
) => {
  try {
    console.log('🔍 searchInquiryHistoryDetails called with:');
    console.log(`  inquiryId: "${inquiryId}"`);
    console.log(`  title: "${title}"`);
    console.log(`  clientId: "${clientId}"`);
    
    if (title === '') {
      console.log('📝 Empty title - returning all inquiries except "新規問い合わせ"');
    } else if (title && title.trim() !== '') {
      console.log(`📝 Searching for title containing: "${title}" (excluding "新規問い合わせ")`);
    } else {
      console.log('📝 No title filter specified - returning all inquiries except "新規問い合わせ"');
    }
    
    let inquiries: any[] = [];

    const filterExpressions: string[] = [];
    const exprAttrValues: Record<string, any> = {};
    const exprAttrNames: Record<string, string> = {};

    // client_idでのフィルタリング（重要！）
    if (clientId) {
      console.log(`📝 Adding client_id filter: ${clientId}`);
      filterExpressions.push('client_id = :clientId');
      exprAttrValues[':clientId'] = clientId;
    }

    // inquiry-historyでは「新規問い合わせ」を常に除外
    console.log('📝 Always excluding "新規問い合わせ" from inquiry-history');
    filterExpressions.push('#title <> :excludedTitle');
    exprAttrValues[':excludedTitle'] = '新規問い合わせ';
    exprAttrNames['#title'] = 'title';

    if (inquiryId) {
      console.log(`📝 Adding inquiry ID filter: ${inquiryId}`);
      filterExpressions.push('#id = :inquiryId');
      exprAttrValues[':inquiryId'] = inquiryId;
      exprAttrNames['#id'] = 'id';
    }

    // titleが指定されている場合（空文字列でない場合）はtitle検索を追加
    if (title && title.trim() !== '') {
      console.log(`📝 Adding title search filter: ${title}`);
      filterExpressions.push('contains(#title, :searchTitle)');
      exprAttrValues[':searchTitle'] = title;
    }

    const scanInput: any = {
      TableName: config.tableNames.inquiry,
    };

    // フィルタがある場合のみFilterExpressionを追加
    if (filterExpressions.length > 0) {
      scanInput.FilterExpression = filterExpressions.join(' AND ');
      scanInput.ExpressionAttributeValues = exprAttrValues;
    }

    if (Object.keys(exprAttrNames).length > 0) {
      scanInput.ExpressionAttributeNames = exprAttrNames;
    }

    console.log('📋 DynamoDB Scan Input:', JSON.stringify(scanInput, null, 2));

    const result = await scanWithoutDeleted(ddbDocClient, scanInput);
    inquiries = result.Items || [];

    console.log(`✅ DynamoDB Scan Result: Found ${inquiries.length} inquiries`);
    if (inquiries.length > 0) {
      console.log('📄 Found inquiries:');
      inquiries.forEach((inquiry, index) => {
        console.log(`  ${index + 1}. title: "${inquiry.title}", inquired_at: "${inquiry.inquired_at}"`);
      });
    } else {
      console.log('📄 No inquiries found (all inquiries might be "新規問い合わせ" which are excluded from inquiry-history)');
    }

    return {
      total: inquiries.length,
      inquiries,
    };

  } catch (error) {
    console.error('Error in searchInquiryHistoryDetails:', error);
    throw error;
  }
};



// Update inquiry history function
export const updateInquiryHistory = async (
  ddbDocClient: DynamoDBDocumentClient,
  clientId: string,
  inquiredAt: string,
  updateData: any
) => {
  try {
    console.log('=== updateInquiryHistory Debug ===');
    console.log('Looking for inquiry with keys:', { clientId, inquiredAt });
    console.log('Table name:', config.tableNames.inquiry);

    // First, check if the inquiry exists
    const getCommand = new GetCommand({
      TableName: config.tableNames.inquiry,
      Key: {
        client_id: clientId,
        inquired_at: inquiredAt
      }
    });

    console.log('GetCommand:', JSON.stringify(getCommand, null, 2));

    const existingItem = await ddbDocClient.send(getCommand);
    
    console.log('DynamoDB response:', {
      itemExists: !!existingItem.Item,
      itemKeys: existingItem.Item ? {
        client_id: existingItem.Item.client_id,
        inquired_at: existingItem.Item.inquired_at,
        title: existingItem.Item.title
      } : 'No item found'
    });

    if (!existingItem.Item) {
      console.log('❌ Inquiry not found in DynamoDB');
      
      // デバッグ: 該当のclient_idで存在するすべてのinquiryを確認
      console.log('🔍 Searching for all inquiries with client_id:', clientId);
      try {
        const scanParams = {
          TableName: config.tableNames.inquiry,
          FilterExpression: 'client_id = :clientId',
          ExpressionAttributeValues: {
            ':clientId': clientId
          }
        };
        
        const scanResult = await scanWithoutDeleted(ddbDocClient, scanParams);
        console.log('Found inquiries for this client:', scanResult.Items?.length || 0);
        
        if (scanResult.Items && scanResult.Items.length > 0) {
          console.log('Existing inquiries:');
          scanResult.Items.forEach((item, index) => {
            console.log(`  ${index + 1}. inquired_at: "${item.inquired_at}", title: "${item.title}", created_at: "${item.created_at}"`);
          });
          
          // 「新規問い合わせ」の中から最新のものを探す
          const newInquiries = scanResult.Items.filter(item => item.title === '新規問い合わせ');
          if (newInquiries.length > 0) {
            // 最新のものを選択（inquired_atで降順ソート）
            newInquiries.sort((a, b) => new Date(b.inquired_at).getTime() - new Date(a.inquired_at).getTime());
            const latestNewInquiry = newInquiries[0];
            
            console.log('🎯 Found latest "新規問い合わせ" inquiry:');
            console.log(`  inquired_at: "${latestNewInquiry.inquired_at}"`);
            console.log(`  title: "${latestNewInquiry.title}"`);
            console.log('💡 Suggestion: Use this inquired_at value for updating');
            
            // 実際にこのレコードを更新対象として使用
            console.log('🔄 Attempting to update the latest new inquiry instead...');
            
            // 再帰的に呼び出すのではなく、正しいinquired_atで直接更新
            const correctInquiredAt = latestNewInquiry.inquired_at;
            
            const updateExpressions: string[] = [];
            const expressionAttributeValues: Record<string, any> = {};
            const expressionAttributeNames: Record<string, string> = {};

            updateData.updated_at = new Date().toISOString();

            Object.keys(updateData).forEach((key, index) => {
              const attributeName = `#attr${index}`;
              const attributeValue = `:val${index}`;

              updateExpressions.push(`${attributeName} = ${attributeValue}`);
              expressionAttributeNames[attributeName] = key;
              expressionAttributeValues[attributeValue] = updateData[key];
            });

            const updateCommand = new UpdateCommand({
              TableName: config.tableNames.inquiry,
              Key: {
                client_id: clientId,
                inquired_at: correctInquiredAt // 正しいinquired_atを使用
              },
              UpdateExpression: `SET ${updateExpressions.join(', ')}`,
              ExpressionAttributeNames: expressionAttributeNames,
              ExpressionAttributeValues: expressionAttributeValues,
              ReturnValues: 'ALL_NEW'
            });

            console.log('UpdateCommand with corrected inquired_at:', JSON.stringify({
              TableName: updateCommand.input.TableName,
              Key: updateCommand.input.Key,
              UpdateExpression: updateCommand.input.UpdateExpression
            }, null, 2));

            const result = await ddbDocClient.send(updateCommand);
            console.log('✅ Update successful with corrected inquired_at');
            return result.Attributes;
          }
        }
      } catch (scanError) {
        console.error('Error during debug scan:', scanError);
      }
      
      return null;
    }

    console.log('✅ Inquiry found, proceeding with update');

    const updateExpressions: string[] = [];
    const expressionAttributeValues: Record<string, any> = {};
    const expressionAttributeNames: Record<string, string> = {};

    updateData.updated_at = new Date().toISOString();

    Object.keys(updateData).forEach((key, index) => {
      const attributeName = `#attr${index}`;
      const attributeValue = `:val${index}`;

      updateExpressions.push(`${attributeName} = ${attributeValue}`);
      expressionAttributeNames[attributeName] = key;
      expressionAttributeValues[attributeValue] = updateData[key];
    });

    const updateCommand = new UpdateCommand({
      TableName: config.tableNames.inquiry,
      Key: {
        client_id: clientId,
        inquired_at: inquiredAt
      },
      UpdateExpression: `SET ${updateExpressions.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW'
    });

    console.log('UpdateCommand:', JSON.stringify({
      TableName: updateCommand.input.TableName,
      Key: updateCommand.input.Key,
      UpdateExpression: updateCommand.input.UpdateExpression
    }, null, 2));

    const result = await ddbDocClient.send(updateCommand);
    console.log('✅ Update successful');
    return result.Attributes;

  } catch (error) {
    console.error('❌ Error in updateInquiryHistory:', error);
    if (error instanceof Error) {
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
    }
    throw error;
  }
};