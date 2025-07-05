import { FastifyRequest, FastifyReply } from 'fastify';
import { errorResponse, successResponse } from '../responses';
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from '../responses/constants/employeeConstant';
import { CreateEmployeeRequestBody, UpdateEmployeeRequestBody } from '../interfaces/employeeInterfaces';
import { CustomFastifyInstance } from '../interfaces/CustomFastifyInstance';
import { getRole, getClientId } from '../middleware/userContext';
import { generateRandomPassword } from '../services/authService';
import { createEmployeeInCognito, deleteUserFromCognito } from '../services/employeeService';
import {
    createEmployeeService,
    getEmployeeById,
    getAllEmployees,
    updateEmployeeService,
    deleteEmployeeService,
    deleteMultipleEmployeesService,
    getEmployeeNameList
} from '../services/employeeService';

export const employeeHandler = async (
    app: CustomFastifyInstance,
    req: FastifyRequest,
    reply: FastifyReply
): Promise<void> => {
    try {
        switch (req.method) {
            case 'POST': {
                const role = getRole(req);
                if (role !== "admin") {
                    return reply.status(404).send(errorResponse(405, ERROR_MESSAGES.NEED_TO_BE_MEMBER));
                }
                const createReq = req as FastifyRequest<{ Body: CreateEmployeeRequestBody }>;
                const data = createReq.body;

                if (!data.family_name || !data.first_name || !data.family_name_kana ||
                    !data.first_name_kana || !data.mail_address || !data.personal_phone_number) {
                    return reply.status(400).send(errorResponse(400, ERROR_MESSAGES.REQUIRE_PARAMETERS));
                }

                // テナントIDを設定
                const clientId = getClientId(req);
                data.client_id = clientId;

                let cognitoUserId: string | null = null;

                try {
                    // 1. Cognito作成
                    data.password = generateRandomPassword();
                    cognitoUserId = await createEmployeeInCognito(data as any);
                    data.employee_id = cognitoUserId;

                    // 2. PostgreSQL保存
                    const newEmployee = await createEmployeeService(data);

                    return reply.status(201).send(successResponse(201, SUCCESS_MESSAGES.CREATE_EMPLOYEE, newEmployee));
                } catch (error) {
                    // 🆕 ロールバック処理: PostgreSQL保存失敗時にCognitoユーザー削除
                    if (cognitoUserId) {
                        try {
                            await deleteUserFromCognito(data.mail_address);
                            console.log(`Rollback: Deleted Cognito user ${data.mail_address}`);
                        } catch (rollbackError) {
                            console.error('Rollback failed:', rollbackError);
                        }
                    }
                    throw error; // 元のエラーを再throw
                }
            }

            case 'PUT': {


                const role = getRole(req);
                if (role !== "admin") {
                    return reply.status(404).send(errorResponse(405, ERROR_MESSAGES.NEED_TO_BE_MEMBER));
                }

                const { id } = req.params as { id?: string };



                const updateReq = req as FastifyRequest<{ Body: UpdateEmployeeRequestBody }>;



                const bodyWithId: UpdateEmployeeRequestBody = {
                    ...updateReq.body,
                    employee_id: id ?? '',
                };

                const updatedEmployee = await updateEmployeeService(bodyWithId);

                return reply
                    .status(200)
                    .send(successResponse(200, SUCCESS_MESSAGES.UPDATE_EMPLOYEE, updatedEmployee));
            }

            case 'GET': {
                const { id } = req.params as { id?: string };
                const { keyword = '', page = '1', limit = '10', search = '' } = req.query as {
                    keyword?: string;
                    page?: string;
                    limit?: string;
                    search?: string;
                };

                if (id) {
                    const clientId = getClientId(req);
                    const employee = await getEmployeeById(id, clientId);
                    return reply.status(200).send(
                        successResponse(200, SUCCESS_MESSAGES.FETCH_EMPLOYEE, employee)
                    );
                } else {
                    const pageNumber = parseInt(page, 10);
                    const limitNumber = parseInt(limit, 10);

                    const safePage = isNaN(pageNumber) || pageNumber < 1 ? 1 : pageNumber;
                    const safeLimit = isNaN(limitNumber) || limitNumber < 1 ? 10 : limitNumber;

                    const clientId = getClientId(req);
                    const result = await getAllEmployees(clientId, keyword, safePage, safeLimit, search);
                    return reply.status(200).send(
                        successResponse(200, SUCCESS_MESSAGES.FETCH_ALL_EMPLOYEES, result)
                    );
                }
            }


            case 'DELETE': {
                const role = getRole(req);
                if (role !== "admin") {
                    return reply.status(404).send(errorResponse(405, ERROR_MESSAGES.NEED_TO_BE_MEMBER));
                }

                const { id } = req.params as { id: string };
                if (!id) {
                    return reply.status(400).send(errorResponse(400, ERROR_MESSAGES.MISSING_EMPLOYEE_ID));
                }

                const result = await deleteEmployeeService(id);
                return reply.status(200).send(successResponse(200, SUCCESS_MESSAGES.DELETE_SUCCESS, result));
            }

            default:
                return reply.status(405).send(errorResponse(405, ERROR_MESSAGES.METHOD_NOT_ALLOWED));
        }
    } catch (error) {
        return reply.status(500).send(
            errorResponse(
                500,
                error instanceof Error ? error.message : 'Unknown error'
            )
        );
    }
};

export const deleteEmployeesHandler = async (
    app: CustomFastifyInstance,
    req: FastifyRequest,
    reply: FastifyReply,
) => {
    const { employees } = req.body as {
        employees: Array<{
            employee_id: string;
            mail_address: string;
        }>
    };

    if (!employees || !Array.isArray(employees) || employees.length === 0) {
        return reply.status(400).send(errorResponse(400, ERROR_MESSAGES.MISSING_EMPLOYEE_ID));
    }

    try {
        const result = await deleteMultipleEmployeesService(employees);
        return reply.status(200).send(successResponse(200, SUCCESS_MESSAGES.DELETE_SUCCESS, result));
    } catch (error: any) {
        if (error.message === ERROR_MESSAGES.MISSING_EMPLOYEE_ID) {
            return reply.status(400).send(errorResponse(400, error.message));
        }
        return reply.status(500).send(errorResponse(500, ERROR_MESSAGES.INTERNAL_SERVER_ERROR));
    }
};

export const getEmployeeNameListHandler = async (
    app: CustomFastifyInstance,
    req: FastifyRequest,
    reply: FastifyReply,
) => {
    try {
        const clientId = getClientId(req);
        const result = await getEmployeeNameList(clientId);

        return reply.status(200).send(
            successResponse(200, 'Employee name list fetched successfully', result)
        );
    } catch (error) {
        console.error('Failed to fetch employee name list (handler):', error);
        return reply.status(500).send({
            statusCode: 500,
            message: 'Internal Server Error',
            error: error instanceof Error ? error.message : error,
        });
    }
};



