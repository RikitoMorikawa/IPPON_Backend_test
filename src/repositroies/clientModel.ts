import { PrismaClient } from '@prisma/client';
import { withoutDeleted } from '../utils/softDelete';

const prisma = new PrismaClient();

export const getClientById = async (clientId: string) => {
    try {
        const client = await prisma.mstClients.findUnique({
            where: withoutDeleted({
                id: clientId
            })
        });

        if (!client) {
            throw new Error('Client not found');
        }

        return client;
    } catch (error) {
        console.error('Error fetching client:', error);
        throw error;
    }
};

export const getEmployeeById = async (employeeId: string | undefined | null) => {
    try {
        // employeeIdが未定義の場合は早期リターン
        if (!employeeId) {
            console.log('getEmployeeById: No employeeId provided, returning null');
            return null;
        }

        const employee = await prisma.mstClientEmployees.findUnique({
            where: withoutDeleted({
                id: employeeId
            })
        });

        return employee || null;
    } catch (error) {
        console.error('Error fetching employee:', error);
        return null;
    }
}; 