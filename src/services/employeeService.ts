import { PrismaClient } from '@prisma/client';
import { ERROR_MESSAGES } from '../responses/constants/employeeConstant';
import { CreateEmployeeRequestBody, UpdateEmployeeRequestBody } from '../interfaces/employeeInterfaces';
import AWS from 'aws-sdk';
import dotenv from 'dotenv';
import { sendTemporaryPasswordEmail } from './emailService';
dotenv.config();

const prisma = new PrismaClient();
const cognito = new AWS.CognitoIdentityServiceProvider();
const EMPLOYEE_IPPON_CLIENT_EMPLOYEE_AWS_USER_POOL_ID = process.env.IPPON_CLIENT_EMPLOYEE_AWS_USER_POOL_ID;

export const createEmployeeService = async (data: CreateEmployeeRequestBody) => {
    if (!data.family_name || !data.first_name || !data.mail_address || !data.client_id) {
        throw new Error(ERROR_MESSAGES.MISSING_PARAMETERS);
    }

    const clientExists = await prisma.mstClients.findUnique({
        where: { id: data.client_id }
    });
    if (!clientExists) {
        throw new Error('Client not found');
    }

    const newEmployee = await prisma.mstClientEmployees.create({
        data: {
            client_id: data.client_id,
            registring_admin_member_id: 'temp-member-id', // TODO: 実際のメンバーIDを設定
            is_active: true,
            last_name: data.family_name,
            first_name: data.first_name,
            last_name_kana: data.family_name_kana || '',
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
    
    // クライアントIDが指定されている場合はフィルタリング
    if (clientId) {
        whereCondition.client_id = clientId;
    }
    
    const employee = await prisma.mstClientEmployees.findFirst({
        where: whereCondition,
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

    const whereConditions: any = {
        is_active: true,
        client_id: clientId  // テナントIDでフィルタリング
    };

    if (keyword || search) {
        const searchTerm = keyword || search;
        whereConditions.OR = [
            { last_name: { contains: searchTerm, mode: 'insensitive' } },
            { first_name: { contains: searchTerm, mode: 'insensitive' } },
            { last_name_kana: { contains: searchTerm, mode: 'insensitive' } },
            { first_name_kana: { contains: searchTerm, mode: 'insensitive' } },
            { mail_address: { contains: searchTerm, mode: 'insensitive' } },
            {
                client: {
                    OR: [
                        { name: { contains: searchTerm, mode: 'insensitive' } },
                        { name_kana: { contains: searchTerm, mode: 'insensitive' } },
                        { mail_address: { contains: searchTerm, mode: 'insensitive' } },
                        { phone_number: { contains: searchTerm, mode: 'insensitive' } }
                    ]
                }
            }
        ];
    }

    const [employees, total] = await Promise.all([
        prisma.mstClientEmployees.findMany({
            where: whereConditions,
            include: {
                client: true
            },
            orderBy: { created_at: 'desc' },
            skip: offset,
            take: limit
        }),
        prisma.mstClientEmployees.count({
            where: whereConditions
        })
    ]);

    return {
        total,
        page,
        limit,
        items: employees
    };
};

export const updateEmployeeService = async (data: UpdateEmployeeRequestBody) => {
    if (!data.employee_id) {
        throw new Error(ERROR_MESSAGES.MISSING_PARAMETERS);
    }

    const existingEmployee = await prisma.mstClientEmployees.findUnique({
        where: { id: data.employee_id }
    });

    if (!existingEmployee) {
        throw new Error(ERROR_MESSAGES.NOT_FOUND_EMPLOYEE);
    }

    const updatedEmployee = await prisma.mstClientEmployees.update({
        where: { id: existingEmployee.id },
        data: {
            last_name: data.family_name,
            first_name: data.first_name,
            last_name_kana: data.family_name_kana,
            first_name_kana: data.first_name_kana,
            mail_address: data.mail_address
        },
        include: {
            client: true
        }
    });

    return updatedEmployee;
};

export const deleteEmployeeService = async (id: string) => {
    const employee = await prisma.mstClientEmployees.findUnique({
        where: { id },
        select: {
            mail_address: true
        }
    });

    if (!employee) {
        throw new Error(ERROR_MESSAGES.NOT_FOUND_EMPLOYEE);
    }

    await prisma.mstClientEmployees.delete({
        where: { id }
    });

    // Delete from Cognito if needed
    try {
        await deleteUserFromCognito(employee.mail_address);
    } catch (error) {
        console.error('Error deleting user from Cognito:', error);
    }

    return {
        status: 'success',
        message: 'Employee record permanently deleted'
    };
};

export const deleteMultipleEmployeesService = async (employees: Array<{ employee_id: string; mail_address: string; }>) => {
    // Delete from Cognito
    for (const employee of employees) {
        try {
            await deleteUserFromCognito(employee.mail_address);
        } catch (error) {
            console.error(`Error deleting user ${employee.mail_address} from Cognito:`, error);
        }
    }

    // Delete from database
    await prisma.mstClientEmployees.deleteMany({
        where: {
            id: {
                in: employees.map(emp => emp.employee_id)
            }
        }
    });

    return {
        status: 'success',
        message: 'Selected employee records permanently deleted',
        deleted_employees: employees.map(emp => ({
            employee_id: emp.employee_id,
            mail_address: emp.mail_address
        }))
    };
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
                { Name: 'family_name', Value: data.family_name },
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
            where: {
                is_active: true,
                client_id: clientId  // テナントIDでフィルタリング
            },
            orderBy: { created_at: 'desc' }
        });

        console.log('Fetched employee names:', employees);

        return employees;
    } catch (error) {
        console.error('Error in getEmployeeNameList:', error);
        throw error;
    }
};


