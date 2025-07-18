import { FastifyRequest, FastifyReply } from 'fastify';
import { CustomFastifyInstance } from '@src/interfaces/CustomFastifyInstance';
import { errorResponse, successResponse } from '@src/responses';
import { SUCCESS_MESSAGES, ERROR_MESSAGES } from '@src/responses/constants/customerConstants';
import { getClientId, getEmployeeId } from '@src/middleware/userContext';
import { checkDynamoDBClient, getDynamoDBClient } from '@src/interfaces/checkDynamoDBClient';
import { getAllCustomerDetails, incrementPropertyInquiryCount } from '@src/repositroies/customerModel';
import { getAllInquires, searchInquiryByProperty } from '@src/repositroies/inquiryModel';
import { getAllProperties, getPropertyById } from '@src/repositroies/propertyModel';
import { InquiryListByPropertyParams } from '@src/interfaces/inquiryInterfaces';
import { getClientById, getEmployeeById } from '../repositroies/clientModel';
import { processCustomerFormData, formatCustomerResponse } from '@src/services/customerService';
import { inquirySchema } from '@src/validations/inquiryValidation';
import { v4 as uuidv4 } from 'uuid';
import { createNewInquiry, saveInquiry } from '@src/repositroies/inquiryModel';

export const inquiryController = async (
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
            case 'POST': {
                try {
                    const { formData } = await processCustomerFormData(req);

                    await inquirySchema.validate(formData, { abortEarly: false });



                    // Make sure customer_id is passed in formData if customer already exists
                    const inquiryId = uuidv4();

                    const newInquiry = createNewInquiry({
                        client_id: clientId,
                        employee_id: formData.employee_id || '', // フォームデータから取得、未指定の場合は空文字
                        customer_id: formData.customer_id, // should be passed in formData
                        property_id: formData.property_id,
                        type: formData.type,
                        method: formData.method,
                        summary: formData.summary,
                        category: formData.category,
                        title: formData.title,
                        created_at: new Date().toISOString(),
                        id: inquiryId,
                    });

                    console.log('Inquiry to save:', newInquiry);

                    await saveInquiry(ddbDocClient, newInquiry);

                    // Get property info to update inquiry count
                    if (formData.property_id) {
                        const propertyResult = await getPropertyById(
                            ddbDocClient,
                            formData.property_id,
                            clientId,
                        );
                        const property = propertyResult.Items?.[0];
                        if (property) {
                            await incrementPropertyInquiryCount(
                                ddbDocClient,
                                property.client_id,
                                property.created_at
                            );
                        }
                    }

                    return reply.status(201).send(
                        successResponse(201, 'Inquiry registered successfully', {
                            inquiry: newInquiry,
                        }),
                    );
                } catch (err) {
                    console.error('Error during inquiry creation:', err);
                    const message = err instanceof Error ? err.message : 'Unexpected error';
                    return reply.status(400).send(errorResponse(400, message));
                }
            }



            case 'GET': {
                const {
                    propertyId = '',
                    startDate = '',
                    endDate = '',
                    inquiryId = '',
                    inquiryMethod = '',
                    page = '',
                    limit = '',
                } = req.query as InquiryListByPropertyParams;

                const hasQueryParams = Object.values(req.query as Record<string, unknown>).some((value) => !!value);

                if (!hasQueryParams) {
                    const [customers, inquiries, properties] = await Promise.all([
                        getAllCustomerDetails(ddbDocClient, clientId),
                        getAllInquires(ddbDocClient, clientId),
                        getAllProperties(ddbDocClient, clientId),
                    ]);

                    const formattedData = await Promise.all(
                        inquiries.inquires.map(async (inquiry: any) => {
                            const customer = customers.customers.find((c: any) => c.id === inquiry.customer_id);
                            const property = properties.properties.find((p: any) => p.id === inquiry.property_id);

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
                                    customer: customer ? formatCustomerResponse(customer) : null,
                                    property,
                                },
                            };
                        }),
                    );

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

                const result = await searchInquiryByProperty(
                    ddbDocClient,
                    clientId,
                    safeLimit,
                    safePage,
                    propertyId,
                    startDate,
                    endDate,
                    inquiryId,
                    inquiryMethod,
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
                                employee: employeeData,
                                customer: item.inquiry.customer ? formatCustomerResponse(item.inquiry.customer) : null
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
