import { PrismaClient } from '@prisma/client';
import { ERROR_MESSAGES } from '../responses/constants/clientConstant';
import { CreateClientRequestBody, UpdateClientRequestBody } from '../interfaces/clientInterfaces';


const prisma = new PrismaClient();

export const getClientById = async (clientId: string) => {
    try {
        const client = await prisma.mstClients.findUnique({
            where: {
                id: clientId
            }
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

export const createClientService = async (data: CreateClientRequestBody) => {
    if (!data.client_name || !data.client_name_kana || !data.client_mail_address) {
        throw new Error(ERROR_MESSAGES.PARAMETER_REQUIRED);
    }

    const newClient = await prisma.mstClients.create({
        data: {
            name: data.client_name,
            name_kana: data.client_name_kana,
            phone_number: data.client_tell || '',
            mail_address: data.client_mail_address,
            hp_address: data.hp_address || '',
            postcode: data.postcode || '',
            prefecture: data.prefecture || '',
            city: data.city || '',
            street_address: data.steet_address || '',
            building_and_room_number: data.building || '',
            created_by_member_id: 'temp-member-id', // TODO: 実際のメンバーIDを設定
            real_estate_number: '',
            is_active: true
        }
    });

    return newClient;
};

export const getClientDetailsService = async (client_id: string) => {
    const client = await prisma.mstClients.findUnique({
        where: { id: client_id }
    });

    if (!client) {
        throw new Error(ERROR_MESSAGES.CLIENT_NOT_FOUND);
    }

    return {
        id: client.id,
        register_timestamp: client.created_at,
        update_timestamp: client.updated_at,
        client_name: client.name,
        client_name_kana: client.name_kana,
        client_tell: client.phone_number,
        client_mail_address: client.mail_address,
        hp_address: client.hp_address,
        postcode: client.postcode,
        prefecture: client.prefecture,
        city: client.city,
        steet_address: client.street_address,
        building: client.building_and_room_number,
        real_estate_number: client.real_estate_number,
        is_active: client.is_active
    };
};

export const updateClientService = async (data: UpdateClientRequestBody) => {
    if (!data.client_id) {
        throw new Error(ERROR_MESSAGES.CLIENT_NOT_FOUND);
    }

    const existingClient = await getClientDetailsService(data.client_id);

    const updatedClient = await prisma.mstClients.update({
        where: { id: data.client_id },
        data: {
            name: data.client_name,
            name_kana: data.client_name_kana,
            phone_number: data.client_tell,
            mail_address: data.client_mail_address,
            hp_address: data.hp_address,
            postcode: data.postcode,
            prefecture: data.prefecture,
            city: data.city,
            street_address: data.steet_address,
            building_and_room_number: data.building,
            updated_by_member_id: 'temp-member-id' // TODO: 実際のメンバーIDを設定
        }
    });

    return updatedClient;
};

export const deleteClientService = async (client_id: string) => {
    const client = await prisma.mstClients.findUnique({
        where: { id: client_id }
    });

    if (!client) {
        throw new Error(ERROR_MESSAGES.CLIENT_NOT_FOUND);
    }

    await prisma.mstClients.delete({
        where: { id: client_id }
    });

    return {
        status: 'success',
        message: 'Client record permanently deleted'
    };
};

export const deleteMultipleClientsService = async (clientIds: string[]) => {
    await prisma.mstClients.deleteMany({
        where: {
            id: {
                in: clientIds
            }
        }
    });

    return {
        status: 'success',
        message: 'Selected client records permanently deleted'
    };
};

export const getAllClients = async (keyword?: string) => {
    const where = keyword ? {
        OR: [
            { name: { contains: keyword, mode: 'insensitive' as const } },
            { name_kana: { contains: keyword, mode: 'insensitive' as const } },
            { mail_address: { contains: keyword, mode: 'insensitive' as const } }
        ]
    } : {};

    const clients = await prisma.mstClients.findMany({
        where,
        orderBy: {
            created_at: 'desc'
        }
    });

    return clients;
};
