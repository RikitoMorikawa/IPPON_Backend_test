import {
  DynamoDBDocumentClient,
  ScanCommand,
} from '@aws-sdk/lib-dynamodb';
import config from '@src/config';
import dayjs from 'dayjs';
import { DashboardInquiryData } from '@src/interfaces/dashboardInterfaces';
import { PaginatedResponse } from '@src/interfaces/responseInterfaces';
import { getEmployeeById } from '@src/repositroies/clientModel';
import { scanWithoutDeleted } from '@src/utils/softDelete';
import { formatCustomerResponse } from '@src/services/customerService';

export const searchDashboard = async (
  ddbDocClient: DynamoDBDocumentClient,
  clientId: string,
  name: string,
  firstName: string,
  lastName: string,
  inquiryStartDate: string,
  inquiryEndDate: string,
  inquiryMethod: string,
  page: number,
  limit: number,
  propertyId: string,
  inquiryId: string,
  employeeId: string,
): Promise<PaginatedResponse<DashboardInquiryData>> => {
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

    // nameパラメータで4つのフィールドを検索
    if (name) {
      customerFilterExpressions.push(
        '(contains(last_name, :name) OR contains(first_name, :name) OR contains(last_name_kana, :name) OR contains(first_name_kana, :name))'
      );
      customerExprAttrValues[':name'] = name;
    }

    // 既存のfirstName, lastNameパラメータも引き続きサポート（後方互換性のため）
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

    const customerResult = await scanWithoutDeleted(ddbDocClient, customerScanInput);
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
      // employeeIdが指定されている場合のみフィルタリング
      // 空文字列の場合は「未割り当て」として検索対象に含める
      if (employeeId === 'unassigned') {
        // 「未割り当て」を検索する場合
        inquiryFilterExpressions.push('(attribute_not_exists(#employee_id) OR #employee_id = :emptyString)');
        inquiryExprAttrValues[':emptyString'] = '';
        inquiryExprAttrNames['#employee_id'] = 'employee_id';
      } else {
        // 特定の従業員を検索する場合
        inquiryFilterExpressions.push('#employee_id = :employeeId');
        inquiryExprAttrValues[':employeeId'] = employeeId;
        inquiryExprAttrNames['#employee_id'] = 'employee_id';
      }
    }

    if (inquiryMethod) {
      inquiryFilterExpressions.push('#method = :method');
      inquiryExprAttrValues[':method'] = inquiryMethod;
      inquiryExprAttrNames['#method'] = 'method';
    }

    // 期間指定での日時検索（inquired_atとcreated_atの両方を試す）
    if (inquiryStartDate && inquiryEndDate) {
      const fromDate = dayjs(inquiryStartDate);
      const toDate = dayjs(inquiryEndDate);
      
      // まずinquired_atがあるかチェック、なければcreated_atを使用
      inquiryFilterExpressions.push(
        '((attribute_exists(inquired_at) AND inquired_at BETWEEN :startDate AND :endDate) OR (attribute_not_exists(inquired_at) AND created_at BETWEEN :startDate AND :endDate))'
      );
      inquiryExprAttrValues[':startDate'] = fromDate.startOf('day').toISOString();
      inquiryExprAttrValues[':endDate'] = toDate.endOf('day').toISOString();
    } else if (inquiryStartDate) {
      // Fromのみが指定された場合は、その日以降
      const fromDate = dayjs(inquiryStartDate);
      inquiryFilterExpressions.push(
        '((attribute_exists(inquired_at) AND inquired_at >= :startDate) OR (attribute_not_exists(inquired_at) AND created_at >= :startDate))'
      );
      inquiryExprAttrValues[':startDate'] = fromDate.startOf('day').toISOString();
    } else if (inquiryEndDate) {
      // Toのみが指定された場合は、その日以前
      const toDate = dayjs(inquiryEndDate);
      inquiryFilterExpressions.push(
        '((attribute_exists(inquired_at) AND inquired_at <= :endDate) OR (attribute_not_exists(inquired_at) AND created_at <= :endDate))'
      );
      inquiryExprAttrValues[':endDate'] = toDate.endOf('day').toISOString();
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

    const inquiryResult = await scanWithoutDeleted(ddbDocClient, inquiryScanInput);
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

      const propertyResult = await scanWithoutDeleted(ddbDocClient, {
        TableName: config.tableNames.properties,
        FilterExpression: propFilterExpr,
        ExpressionAttributeValues: propExprValues
      });
      properties = propertyResult.Items || [];
    }

    // === 4. Join Data ===
    const combined: DashboardInquiryData[] = await Promise.all(
      inquiries.map(async (inquiry) => {
        const customer = customers.find(c => c.id === inquiry.customer_id);
        const property = properties.find(p => p.id === inquiry.property_id);
        
        // Get employee details for the inquiry's assigned employee
        const employee = inquiry.employee_id ? await getEmployeeById(inquiry.employee_id) : null;
        
        return {
          inquiry: {
            id: inquiry.id,
            method: inquiry.method,
            type: inquiry.type,
            summary: inquiry.summary,
            created_at: inquiry.created_at,
            property: property ? {
              id: property.id,
              name: property.name,
            } : {
              id: '',
              name: '',
            },
            customer: customer ? formatCustomerResponse(customer) : {
              id: '',
              client_id: '',
              employee_id: '',
              customer_type: '',
              created_at: '',
              updated_at: '',
              deleted_at: '',
            },
            employee: employee ? {
              id: employee.id,
              first_name: employee.first_name,
              last_name: employee.last_name,
              mail_address: employee.mail_address,
            } : {
              id: '',
              first_name: '未割り当て',
              last_name: '',
              mail_address: '',
            },
          },
        };
      })
    );

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
