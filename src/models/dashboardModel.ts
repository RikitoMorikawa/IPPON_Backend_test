import {
  DynamoDBDocumentClient,
  ScanCommand,
} from '@aws-sdk/lib-dynamodb';
import config from '@src/config';
import dayjs from 'dayjs';



export const searchDashboard = async (
  ddbDocClient: DynamoDBDocumentClient,
  clientId: string,
  firstName: string,
  lastName: string,
  inquiryTimestamp: string,
  inquiryMethod: string,
  employeeName: string,
  page: number,
  limit: number,
  propertyId: string,
  inquiryId: string,
  employeeId: string,
) => {
  try {
    page = Number.isNaN(page) || page < 1 ? 1 : page;
    limit = Number.isNaN(limit) || limit < 1 ? 10 : limit;

    let customers: any[] = [];
    let inquiries: any[] = [];
    let properties: any[] = [];

    // === 1. Filter Customers ===
    const customerFilterExpressions: string[] = [];
    const customerExprAttrValues: Record<string, string> = {};

    customerFilterExpressions.push('client_id = :clientId');
    customerExprAttrValues[':clientId'] = clientId;

    if (firstName) {
      customerFilterExpressions.push(
        '(contains(first_name, :firstName) OR contains(first_name_kana, :firstName))'
      );
      customerExprAttrValues[':firstName'] = firstName;
    }

    if (lastName) {
      customerFilterExpressions.push(
        '(contains(last_name, :lastName) OR contains(middle_name, :lastName) OR contains(last_name_kana, :lastName) OR contains(middle_name_kana, :lastName))'
      );
      customerExprAttrValues[':lastName'] = lastName;
    }

    const customerScanInput: any = {
      TableName: config.tableNames.customers,
      FilterExpression: customerFilterExpressions.join(' AND '),
      ExpressionAttributeValues: customerExprAttrValues
    };

    const customerResult = await ddbDocClient.send(new ScanCommand(customerScanInput));
    customers = customerResult.Items || [];

    const customerIds = customers.map(c => c.id);
    if (customerIds.length === 0) {
      return {
        total: 0,
        page,
        limit,
        items: []
      };
    }

    // === 2. Filter Inquiries ===
    const inquiryFilterExpressions: string[] = [];
    const inquiryExprAttrValues: Record<string, any> = {};
    const inquiryExprAttrNames: Record<string, string> = {};

    inquiryFilterExpressions.push('client_id = :clientId');
    inquiryExprAttrValues[':clientId'] = clientId;

    inquiryFilterExpressions.push('#title = :title');
    inquiryExprAttrValues[':title'] = '新規問い合わせ';
    inquiryExprAttrNames['#title'] = 'title';

    if (inquiryId) {
      inquiryFilterExpressions.push('#id = :inquiryId');
      inquiryExprAttrValues[':inquiryId'] = inquiryId;
      inquiryExprAttrNames['#id'] = 'id';
    }

    if (employeeId) {
      inquiryFilterExpressions.push('#employee_id = :employeeId');
      inquiryExprAttrValues[':employeeId'] = employeeId;
      inquiryExprAttrNames['#employee_id'] = 'employee_id';
    }

    if (inquiryMethod) {
      inquiryFilterExpressions.push('#method = :method');
      inquiryExprAttrValues[':method'] = inquiryMethod;
      inquiryExprAttrNames['#method'] = 'method';
    }

    if (inquiryTimestamp) {
      const selectedDate = dayjs(inquiryTimestamp);
      inquiryFilterExpressions.push('created_at BETWEEN :startDate AND :endDate');
      inquiryExprAttrValues[':startDate'] = selectedDate.startOf('day').toISOString();
      inquiryExprAttrValues[':endDate'] = selectedDate.endOf('day').toISOString();
    }

    if (customerIds.length > 0) {
      const customerConditions = customerIds.map((_, i) => `customer_id = :id${i}`).join(' OR ');
      inquiryFilterExpressions.push(`(${customerConditions})`);
      customerIds.forEach((id, i) => {
        inquiryExprAttrValues[`:id${i}`] = id;
      });
    }

    const inquiryScanInput: any = {
      TableName: config.tableNames.inquiry,
      FilterExpression: inquiryFilterExpressions.join(' AND '),
      ExpressionAttributeValues: inquiryExprAttrValues
    };
    if (Object.keys(inquiryExprAttrNames).length > 0) {
      inquiryScanInput.ExpressionAttributeNames = inquiryExprAttrNames;
    }

    const inquiryResult = await ddbDocClient.send(new ScanCommand(inquiryScanInput));
    inquiries = inquiryResult.Items || [];

    // === 3. Load Properties ===
    const propertyIds = [...new Set(inquiries.map(i => i.property_id))];
    if (propertyIds.length > 0) {
      const propFilterExpr = `client_id = :clientId AND (${propertyIds.map((_, i) => `id = :pid${i}`).join(' OR ')})`;
      const propExprValues: Record<string, any> = {
        ':clientId': clientId
      };
      propertyIds.forEach((id, i) => {
        propExprValues[`:pid${i}`] = id;
      });

      const propertyResult = await ddbDocClient.send(new ScanCommand({
        TableName: config.tableNames.properties,
        FilterExpression: propFilterExpr,
        ExpressionAttributeValues: propExprValues
      }));
      properties = propertyResult.Items || [];
    }

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
    const totalPages = Math.ceil(total / limit);
    const currentPage = Math.min(page, totalPages || 1);
    const startIndex = (currentPage - 1) * limit;
    const pagedItems = combined.slice(startIndex, startIndex + limit);

    return {
      total,
      page: currentPage,
      limit,
      items: pagedItems
    };

  } catch (error) {
    console.error('Error in searchDashboard:', error);
    throw error;
  }
};
