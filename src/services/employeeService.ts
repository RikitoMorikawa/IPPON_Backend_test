import { PrismaClient } from '@prisma/client';
import { ERROR_MESSAGES } from '../responses/constants/employeeConstant';
import { CreateEmployeeRequestBody, UpdateEmployeeRequestBody } from '../interfaces/employeeInterfaces';
import AWS from 'aws-sdk';
import dotenv from 'dotenv';
import { sendTemporaryPasswordEmail } from './emailService';
import { withoutDeleted, softDeletePrisma } from '../utils/softDelete';

dotenv.config();

const prisma = new PrismaClient();
const cognito = new AWS.CognitoIdentityServiceProvider();
const EMPLOYEE_IPPON_CLIENT_EMPLOYEE_AWS_USER_POOL_ID = process.env.IPPON_CLIENT_EMPLOYEE_AWS_USER_POOL_ID;

export const createEmployeeService = async (data: CreateEmployeeRequestBody) => {
    if (!data.last_name || !data.first_name || !data.mail_address || !data.client_id || !data.employee_id) {
        throw new Error(ERROR_MESSAGES.MISSING_PARAMETERS);
    }

    // クライアントの存在確認
    const clientExists = await prisma.mstClients.findUnique({
        where: withoutDeleted({ id: data.client_id })
    });

    if (!clientExists) {
        throw new Error('Client not found');
    }

    // 既存のメール確認
    const existingEmployeeByEmail = await prisma.mstClientEmployees.findFirst({
        where: withoutDeleted({ mail_address: data.mail_address })
    });

    if (existingEmployeeByEmail) {
        throw new Error('User with this email already exists');
    }

    const newEmployee = await prisma.mstClientEmployees.create({
        data: {
            id: data.employee_id,
            client_id: data.client_id,
            registring_admin_member_id: null, 
            is_active: true,
            is_admin: data.role === 'admin',
            last_name: data.last_name,
            first_name: data.first_name,
            last_name_kana: data.last_name_kana || '',
            first_name_kana: data.first_name_kana || '',
            mail_address: data.mail_address
        },
        include: {
            client: true
        }
    });

    return newEmployee;
};

export const getEmployeeById = async (id: string, clientId?: string) => {
    const whereCondition: any = { 
        id,
        is_active: true
    };
    
    if (clientId) {
        whereCondition.client_id = clientId;
    }
    
    const employee = await prisma.mstClientEmployees.findUnique({
        where: withoutDeleted(whereCondition),
        include: {
            client: true
        }
    });

    if (!employee) {
        throw new Error(ERROR_MESSAGES.NOT_FOUND_EMPLOYEE);
    }

    return employee;
};

export const getAllEmployees = async (clientId: string, keyword?: string, page = 1, limit = 10, search?: string) => {
    const offset = (page - 1) * limit;

    let whereCondition: any = withoutDeleted({ client_id: clientId });

    if (keyword) {
        whereCondition.OR = [
            { first_name: { contains: keyword, mode: 'insensitive' } },
            { last_name: { contains: keyword, mode: 'insensitive' } },
            { mail_address: { contains: keyword, mode: 'insensitive' } }
        ];
    }

    if (search) {
        const searchConditions = {
            OR: [
                { first_name: { contains: search, mode: 'insensitive' } },
                { last_name: { contains: search, mode: 'insensitive' } },
                { mail_address: { contains: search, mode: 'insensitive' } }
            ]
        };
        
        // keywordとsearchの両方がある場合は、ANDで結合
        if (keyword) {
            whereCondition = withoutDeleted({
                client_id: clientId,
                AND: [
                    {
                        OR: [
                            { first_name: { contains: keyword, mode: 'insensitive' } },
                            { last_name: { contains: keyword, mode: 'insensitive' } },
                            { mail_address: { contains: keyword, mode: 'insensitive' } }
                        ]
                    },
                    searchConditions
                ]
            });
        } else {
            whereCondition = withoutDeleted({
                client_id: clientId,
                ...searchConditions
            });
        }
    }

    const [employees, total] = await Promise.all([
        prisma.mstClientEmployees.findMany({
            where: whereCondition,
            include: {
                client: true
            },
            orderBy: { created_at: 'desc' },
            skip: offset,
            take: limit
        }),
        prisma.mstClientEmployees.count({
            where: whereCondition
        })
    ]);

    return {
        total,
        page,
        limit,
        items: employees
    };
};

export const updateEmployeeService = async (data: UpdateEmployeeRequestBody, isUpdatingSelf: boolean, shouldUpdateToken: boolean = false) => {
    if (!data.employee_id) {
        throw new Error(ERROR_MESSAGES.MISSING_PARAMETERS);
    }

    const existingEmployee = await prisma.mstClientEmployees.findUnique({
        where: withoutDeleted({ id: data.employee_id })
    });

    if (!existingEmployee) {
        throw new Error(ERROR_MESSAGES.NOT_FOUND_EMPLOYEE);
    }

    // トランザクション処理で整合性を保つ
    return await prisma.$transaction(async (tx) => {
        // 1. PostgreSQL更新
        const updatedEmployee = await tx.mstClientEmployees.update({
            where: { id: existingEmployee.id },
            data: {
                last_name: data.last_name,
                first_name: data.first_name,
                last_name_kana: data.last_name_kana,
                first_name_kana: data.first_name_kana,
                mail_address: data.mail_address,
                is_admin: data.role === 'admin'
            },
            include: {
                client: true
            }
        });

        // 2. Cognito更新（失敗時はトランザクションを中断）
        try {
            await updateEmployeeInCognito(existingEmployee.mail_address, {
                email: data.mail_address,
                family_name: data.last_name,
                given_name: data.first_name,
                role: data.role,
                client_id: existingEmployee.client_id
            });
        } catch (error) {
            console.error('Error updating user in Cognito:', error);
            // Cognito更新失敗時はトランザクションを中断してロールバック
            throw new Error(`Failed to update user in Cognito: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }

        return {
            employee: updatedEmployee,
        };
    });
};

export const deleteEmployeeService = async (id: string) => {
    const employee = await prisma.mstClientEmployees.findUnique({
        where: withoutDeleted({ id }),
        select: {
            mail_address: true
        }
    });

    if (!employee) {
        throw new Error(ERROR_MESSAGES.NOT_FOUND_EMPLOYEE);
    }

    // トランザクション処理で整合性を保つ
    return await prisma.$transaction(async (tx) => {
        // 1. PostgreSQL論理削除
        await tx.mstClientEmployees.update({
            where: { id },
            data: { deleted_at: new Date() }
        });

        // 2. Cognito削除（物理削除のまま）
        try {
            await deleteUserFromCognito(employee.mail_address);
        } catch (error) {
            console.error('Error deleting user from Cognito:', error);
            // Cognito削除失敗時はトランザクションを中断してロールバック
            throw new Error(`Failed to delete user from Cognito: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }

        return {
            status: 'success',
            message: 'Employee record soft deleted, Cognito user permanently deleted'
        };
    });
};

export const deleteMultipleEmployeesService = async (employees: Array<{ employee_id: string; mail_address: string; }>) => {
    // トランザクション処理で整合性を保つ
    return await prisma.$transaction(async (tx) => {
        // 1. PostgreSQL論理削除
        const deletePromises = employees.map(emp => 
            tx.mstClientEmployees.update({
                where: { id: emp.employee_id },
                data: { deleted_at: new Date() }
            })
        );
        await Promise.all(deletePromises);

        // 2. Cognito削除（物理削除のまま）
        const deletionErrors = [];
        for (const employee of employees) {
            try {
                await deleteUserFromCognito(employee.mail_address);
            } catch (error) {
                console.error(`Error deleting user ${employee.mail_address} from Cognito:`, error);
                deletionErrors.push(`Failed to delete ${employee.mail_address} from Cognito: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        }

        // 一つでもCognito削除に失敗した場合はロールバック
        if (deletionErrors.length > 0) {
            throw new Error(`Cognito deletion failed: ${deletionErrors.join(', ')}`);
        }

        return {
            status: 'success',
            message: 'Selected employee records soft deleted, Cognito users permanently deleted',
            deleted_employees: employees.map(emp => ({
                employee_id: emp.employee_id,
                mail_address: emp.mail_address
            }))
        };
    });
};

export const deleteUserFromCognito = async (mailAddress: string): Promise<void> => {
    try {
        await cognito.adminDeleteUser({
            UserPoolId: EMPLOYEE_IPPON_CLIENT_EMPLOYEE_AWS_USER_POOL_ID as string,
            Username: mailAddress
        }).promise();
    } catch (error: any) {
        console.error('Cognito Deletion Error:', error);

        if (error.code === 'UserNotFoundException') {
            console.warn(`User ${mailAddress} not found in Cognito User Pool`);
            return;
        }

        throw new Error('Error deleting user from Cognito');
    }
};

export const updateEmployeeInCognito = async (currentEmail: string, updateData: {
    email?: string;
    family_name?: string;
    given_name?: string;
    role?: string;
    client_id?: string;
}): Promise<void> => {
    try {
        const attributes = [];

        if (updateData.email && updateData.email !== currentEmail) {
            attributes.push({ Name: 'email', Value: updateData.email });
            attributes.push({ Name: 'email_verified', Value: 'true' });
        }
        if (updateData.family_name) {
            attributes.push({ Name: 'family_name', Value: updateData.family_name });
        }
        if (updateData.given_name) {
            attributes.push({ Name: 'given_name', Value: updateData.given_name });
        }
        if (updateData.role) {
            attributes.push({ Name: 'custom:role', Value: updateData.role });
        }

        if (attributes.length > 0) {
            await cognito.adminUpdateUserAttributes({
                UserPoolId: EMPLOYEE_IPPON_CLIENT_EMPLOYEE_AWS_USER_POOL_ID as string,
                Username: currentEmail,
                UserAttributes: attributes
            }).promise();
        }
    } catch (error: any) {
        console.error('Cognito Update Error:', error);
        if (error.code === 'UserNotFoundException') {
            console.warn(`User ${currentEmail} not found in Cognito User Pool`);
            return;
        }
        if (error.code === 'UsernameExistsException') {
            throw new Error('User with this email already exists in Cognito');
        }
        throw new Error('Error updating user in Cognito');
    }
};

export const createEmployeeInCognito = async (data: CreateEmployeeRequestBody): Promise<string> => {
    try {
        if (!data.password) {
            throw new Error('Password is required for Cognito user creation');
        }

        const response = await cognito.adminCreateUser({
            UserPoolId: EMPLOYEE_IPPON_CLIENT_EMPLOYEE_AWS_USER_POOL_ID as string,
            Username: data.mail_address,
            UserAttributes: [
                { Name: 'email', Value: data.mail_address },
                { Name: 'email_verified', Value: 'true' },
                { Name: 'custom:clientId', Value: data.client_id || '' },
                { Name: 'custom:type', Value: data.type || 'employee' },
                { Name: 'custom:role', Value: data.role || 'general' },
                { Name: 'custom:is_approve', Value: 'true' },
                { Name: 'family_name', Value: data.last_name },
                { Name: 'given_name', Value: data.first_name },
            ],
            MessageAction: 'SUPPRESS',
        }).promise();

        if (!response.User || !response.User.Username) {
            throw new Error('Failed to create user in Cognito');
        }

        const sub = response.User.Attributes?.find(attr => attr.Name === 'sub')?.Value;
        if (!sub) {
            throw new Error('Failed to retrieve Cognito user sub');
        }

        await cognito.adminSetUserPassword({
            UserPoolId: EMPLOYEE_IPPON_CLIENT_EMPLOYEE_AWS_USER_POOL_ID as string,
            Username: data.mail_address,
            Password: data.password,
            Permanent: true,
        }).promise();
        await sendTemporaryPasswordEmail(data.mail_address, data.password);
        return sub;
    } catch (error: any) {
        if (error.code === 'UsernameExistsException') {
            throw new Error('User with this email already exists.');
        }
        console.error('Cognito Error:', error);
        throw new Error('Error creating user in Cognito');
    }
};

export const getEmployeeNameList = async (clientId: string) => {
    try {
        console.log('Fetching employee names for client:', clientId);

        const employees = await prisma.mstClientEmployees.findMany({
            select: {
                id: true,
                first_name: true,
                last_name: true
            },
            where: withoutDeleted({
                client_id: clientId,
                is_active: true
            }),
            orderBy: {
                created_at: 'desc'
            }
        });

        console.log(`Found ${employees.length} employees for client ${clientId}`);

        return employees.map(employee => ({
            value: employee.id,
            label: `${employee.last_name} ${employee.first_name}`
        }));
    } catch (error) {
        console.error('Error in getEmployeeNameList:', error);
        throw new Error('従業員一覧の取得に失敗しました');
    }
};


