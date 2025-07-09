import { FastifyRequest, FastifyReply } from 'fastify';
import { CustomFastifyInstance } from '@src/interfaces/CustomFastifyInstance';
import { errorResponse } from '@src/responses';
import { SUCCESS_MESSAGES, ERROR_MESSAGES } from '@src/responses/constants/customerConstants';
import { getClientId } from '@src/middleware/userContext';
import { checkDynamoDBClient, getDynamoDBClient } from '@src/interfaces/checkDynamoDBClient';
import { getAllCustomers } from '@src/repositroies/customerModel';
import { getAllInquires } from '@src/repositroies/inquiryModel';
import { getAllProperties } from '@src/repositroies/propertyModel';
import { searchDashboard } from '@src/repositroies/dashboardModel';
import { DashboardCustomerQueryParams, DashboardInquiryResponse } from '@src/interfaces/dashboardInterfaces';
import { getEmployeeById } from '@src/repositroies/clientModel';

export const dashboardHandler = async (
    app: CustomFastifyInstance,
    req: FastifyRequest,
    reply: FastifyReply,
): Promise<void> => {
    try {
        const clientId = getClientId(req);

        if (!checkDynamoDBClient(app, reply)) return;
        const ddbDocClient = getDynamoDBClient(app);

        switch (req.method) {
            case 'GET': {
                const {
                    firstName = '',
                    lastName = '',
                    inquiryTimestamp = '',
                    inquiryMethod = '',
                    page = 1,
                    limit = 10,
                    propertyId = '',
                    inquiryId = '',
                    employeeId: queryEmployeeId = '',
                } = req.query as DashboardCustomerQueryParams;

                const hasQueryParams = Object.values(req.query as Record<string, unknown>).some((value) => !!value);
                const noFilters = !firstName && !lastName && !inquiryTimestamp && !inquiryMethod && !inquiryId && !propertyId && !queryEmployeeId;

                if (!hasQueryParams || noFilters) {
                    const [customers, inquiries, properties] = await Promise.all([
                        getAllCustomers(ddbDocClient, clientId),
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
                                    customer: customer ? {
                                        id: customer.id,
                                        first_name: customer.first_name,
                                        last_name: customer.last_name,
                                        mail_address: customer.mail_address,
                                        phone_number: customer.phone_number,
                                        employee_id: customer.employee_id || '', // 顧客の担当者IDを正しく設定
                                    } : {
                                        id: '',
                                        first_name: '',
                                        last_name: '',
                                        mail_address: '',
                                        phone_number: '',
                                        employee_id: '', // 顧客が見つからない場合は空文字
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
                    
                    const response: DashboardInquiryResponse = {
                        status: 200,
                        message: SUCCESS_MESSAGES.CUSTOMER_SEARCHED,
                        data: {
                            total,
                            page: pageNumber,
                            limit: limitNumber,
                            items: pagedItems,
                        }
                    };

                    return reply.status(200).send(response);
                }

                const pageNumber = typeof page === 'string' ? parseInt(page, 10) : page || 1;
                const limitNumber = typeof limit === 'string' ? parseInt(limit, 10) : limit || 10;

                // fallback to defaults
                const safePage = isNaN(pageNumber) || pageNumber < 1 ? 1 : pageNumber;
                const safeLimit = isNaN(limitNumber) || limitNumber < 1 ? 10 : limitNumber;
                
                const result = await searchDashboard(
                    ddbDocClient,
                    clientId,
                    firstName,
                    lastName,
                    inquiryTimestamp,
                    inquiryMethod,
                    safePage,
                    safeLimit,
                    propertyId,
                    inquiryId,
                    queryEmployeeId,
                );

                const response: DashboardInquiryResponse = {
                    status: 200,
                    message: SUCCESS_MESSAGES.CUSTOMER_SEARCHED,
                    data: result
                };

                return reply.status(200).send(response);
            }

            default:
                return reply.status(405).send(errorResponse(405, ERROR_MESSAGES.METHOD_NOT_ALLOWED));
        }
    } catch (error) {
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
