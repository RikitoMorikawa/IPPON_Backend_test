import { FastifyRequest, FastifyReply } from 'fastify';
import { CustomFastifyInstance } from '@src/interfaces/CustomFastifyInstance';
import { errorResponse, successResponse } from '@src/responses';
import { SUCCESS_MESSAGES, ERROR_MESSAGES } from '@src/responses/constants/customerConstants';
import { getClientId, getEmployeeId } from '@src/middleware/userContext';
import { checkDynamoDBClient, getDynamoDBClient } from '@src/interfaces/checkDynamoDBClient';
import { getAllCustomers } from '@src/models/customerModel';
import { getAllInquires } from '@src/models/inquiryModel';
import { getAllProperties } from '@src/models/propertyModel';
import { searchDashboard } from '@src/models/dashboardModel';
import { DashboardQueryParams } from '@src/interfaces/dashboardInterfaces';
import { getClientById, getEmployeeById } from '../models/clientModel';

export const dashboardHandler = async (
    app: CustomFastifyInstance,
    req: FastifyRequest,
    reply: FastifyReply,
): Promise<void> => {
    try {
        const clientId = getClientId(req);
        const employeeId = getEmployeeId(req);

        if (!checkDynamoDBClient(app, reply)) return;
        const ddbDocClient = getDynamoDBClient(app);

        switch (req.method) {
            case 'GET': {
                const {
                    firstName = '',
                    lastName = '',
                    inquiryTimestamp = '',
                    manager = '',
                    inquiryMethod = '',
                    page = '',
                    limit = '',
                    propertyId = '',
                    inquiryId = '',
                    employeeId='',
                } = req.query as DashboardQueryParams;

                const hasQueryParams = Object.values(req.query as Record<string, unknown>).some((value) => !!value);
               const noFilters = !firstName && !lastName && !inquiryTimestamp && !manager && !inquiryMethod !&& inquiryId !&& propertyId;

                if (!hasQueryParams || noFilters ) {
                    const [customers, inquiries, properties] = await Promise.all([
                        getAllCustomers(ddbDocClient, clientId),
                        getAllInquires(ddbDocClient, clientId),
                        getAllProperties(ddbDocClient, clientId),
                    ]);

                   const formattedData = await Promise.all(
                        inquiries.inquires.map(async (inquiry) => {
                            const customer = customers.customers.find((c) => c.id === inquiry.customer_id);
                            const property = properties.properties.find((p) => p.id === inquiry.property_id);

                            // Fetch client and employee data
                            const [clientData, employeeData] = await Promise.all([
                                getClientById(inquiry.client_id),
                                getEmployeeById(inquiry.employee_id)
                            ]);

                            return {
                                inquiry: {
                                    ...inquiry,
                                    client: clientData,
                                    employee: employeeData,
                                    customer,
                                    property,
                                },
                            };
                        }),
                    );

                    // Pagination logic

                    const pageNumber = parseInt(page, 10) || 1;
                    const limitNumber = parseInt(limit, 10) || 10;

                    const total = formattedData.length;
                    const startIndex = (pageNumber - 1) * limitNumber;
                    const pagedItems = formattedData.slice(startIndex, startIndex + limitNumber);
                    const paginatedResponse = {
                        total,
                        page: pageNumber,
                        limit: limitNumber,
                        items: pagedItems,
                    };

                    return reply
                        .status(200)
                        .send(successResponse(200, SUCCESS_MESSAGES.CUSTOMER_SEARCHED, paginatedResponse));
                }

                const pageNumber = parseInt(page, 10);
                const limitNumber = parseInt(limit, 10);

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
                    manager,
                    safePage,
                    safeLimit,
                    propertyId,
                    inquiryId,
                    employeeId,
                );

                // Add client and employee data to each inquiry
                const formattedResult = await Promise.all(
                    result.items.map(async (item) => {
                        const [clientData, employeeData] = await Promise.all([
                            getClientById(item.inquiry.client_id),
                            getEmployeeById(item.inquiry.employee_id)
                        ]);

                        return {
                            ...item,
                            inquiry: {
                                ...item.inquiry,
                                client: clientData,
                                employee: employeeData
                            }
                        };
                    })
                );

                return reply
                    .status(200)
                    .send(successResponse(200, SUCCESS_MESSAGES.CUSTOMER_SEARCHED, {
                        ...result,
                        items: formattedResult
                    }));
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
