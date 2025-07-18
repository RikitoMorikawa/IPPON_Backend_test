import { FastifyRequest, FastifyReply } from 'fastify';
import { CustomFastifyInstance } from '@src/interfaces/CustomFastifyInstance';
import { errorResponse } from '@src/responses';
import { SUCCESS_MESSAGES, ERROR_MESSAGES } from '@src/responses/constants/customerConstants';
import { getClientId } from '@src/middleware/userContext';
import { checkDynamoDBClient, getDynamoDBClient } from '@src/interfaces/checkDynamoDBClient';
import { getAllCustomerDetails } from '@src/repositroies/customerModel';
import { getAllInquires } from '@src/repositroies/inquiryModel';
import { getAllProperties } from '@src/repositroies/propertyModel';
import { searchDashboard } from '@src/repositroies/dashboardModel';
import {
  DashboardCustomerQueryParams,
  DashboardSuccessResponse,
  GetDashboardResponse,
} from '@src/interfaces/dashboardInterfaces';
import { getEmployeeById } from '@src/repositroies/clientModel';
import { formatCustomerResponse } from '@src/services/customerService';

// dashboard（全体ダッシュボード）API
export const getDashBoardCustomers = async (
  app: CustomFastifyInstance,
  request: FastifyRequest<{
    Querystring: DashboardCustomerQueryParams;
  }>,
  reply: FastifyReply<GetDashboardResponse>,
): Promise<void> => {
  try {
    const clientId = getClientId(request);

    if (!checkDynamoDBClient(app, reply)) return;
    const ddbDocClient = getDynamoDBClient(app);

    const {
      name = '',
      firstName = '',
      lastName = '',
      inquiryStartDate = '',
      inquiryEndDate = '',
      inquiryMethod = '',
      page = 1,
      limit = 10,
      propertyId = '',
      inquiryId = '',
      employeeId: queryEmployeeId = '',
    } = request.query as DashboardCustomerQueryParams;

    console.log('📊 Dashboard query parameters:', {
      name,
      firstName,
      lastName,
      inquiryStartDate,
      inquiryEndDate,
      inquiryMethod: `"${inquiryMethod}"`,
      page,
      limit,
      propertyId,
      inquiryId,
      employeeId: queryEmployeeId,
    });

    const hasQueryParams = Object.values(request.query as Record<string, unknown>).some(
      (value) => !!value,
    );
    const noFilters =
      !name &&
      !firstName &&
      !lastName &&
      !inquiryStartDate &&
      !inquiryEndDate &&
      !inquiryMethod &&
      !inquiryId &&
      !propertyId &&
      !queryEmployeeId;

    console.log('📊 Filter check:', { hasQueryParams, noFilters });

    if (!hasQueryParams || noFilters) {
      console.log('📊 Performing full data retrieval (no filters)');
      const [customers, inquiries, properties] = await Promise.all([
        getAllCustomerDetails(ddbDocClient, clientId),
        getAllInquires(ddbDocClient, clientId),
        getAllProperties(ddbDocClient, clientId),
      ]);

      const formattedData = await Promise.all(
        inquiries.inquires.map(async (inquiry) => {
          const customer = customers.customers.find((c) => c.id === inquiry.customer_id);
          const property = properties.properties.find((p) => p.id === inquiry.property_id);

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

      // Pagination logic
      const pageNumber = typeof page === 'string' ? parseInt(page, 10) : page || 1;
      const limitNumber = typeof limit === 'string' ? parseInt(limit, 10) : limit || 10;

      const total = formattedData.length;
      const startIndex = (pageNumber - 1) * limitNumber;
      const pagedItems = formattedData.slice(startIndex, startIndex + limitNumber);

      const response: DashboardSuccessResponse = {
        status: 200,
        message: SUCCESS_MESSAGES.CUSTOMER_SEARCHED,
        data: {
          total,
          page: pageNumber,
          limit: limitNumber,
          items: pagedItems,
        },
      };

      return reply.status(200).send(response);
    } else {
      // フィルタリング付きの検索処理
      console.log('📊 Performing filtered search with searchDashboard');
      
      const pageNumber = typeof page === 'string' ? parseInt(page, 10) : page || 1;
      const limitNumber = typeof limit === 'string' ? parseInt(limit, 10) : limit || 10;

      const result = await searchDashboard(
        ddbDocClient,
        clientId,
        name,
        firstName,
        lastName,
        inquiryStartDate,
        inquiryEndDate,
        inquiryMethod,
        pageNumber,
        limitNumber,
        propertyId,
        inquiryId,
        queryEmployeeId,
      );

      console.log('📊 Search result:', {
        total: result.total,
        page: result.page,
        limit: result.limit,
        itemsCount: result.items.length,
      });

      const response: DashboardSuccessResponse = {
        status: 200,
        message: SUCCESS_MESSAGES.CUSTOMER_SEARCHED,
        data: result,
      };

      return reply.status(200).send(response);
    }
  } catch (error) {
    console.error('❌ Dashboard error:', error);
    return reply
      .status(500)
      .send(
        errorResponse(
          500,
          ERROR_MESSAGES.SERVER_ERROR,
          error instanceof Error ? error.message : 'Unknown error',
        ),
      );
  }
};


