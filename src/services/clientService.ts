import { PrismaClient } from '@prisma/client';
import { ERROR_MESSAGES } from '../responses/constants/clientConstant';
import { CreateClientRequestBody, UpdateClientRequestBody } from '../interfaces/clientInterfaces';
import { getPrefectureCodeByName as getCustomerPrefectureCodeByName, getPrefectureByCode as getCustomerPrefectureByCode } from '../enums/customerEnums';
import { withoutDeleted, softDeletePrisma } from '../utils/softDelete';

const prisma = new PrismaClient();

export const getClientById = async (clientId: string) => {
    try {
        const client = await prisma.mstClients.findUnique({
            where: withoutDeleted({ id: clientId })
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


// TODO: クライアント作成はクライアント管理プロダクトなので不要かも
export const createClientService = async (data: CreateClientRequestBody) => {
    if (!data.client_name || !data.client_name_kana || !data.client_mail_address) {
        throw new Error(ERROR_MESSAGES.PARAMETER_REQUIRED);
    }

    // 都道府県コードを都道府県名に変換
    const prefectureName = data.prefecture ? getCustomerPrefectureByCode(data.prefecture as any) : '';

    const newClient = await prisma.mstClients.create({
        data: {
            name: data.client_name,
            name_kana: data.client_name_kana,
            phone_number: data.client_tell || '',
            mail_address: data.client_mail_address,
            hp_address: data.hp_address || '',
            postcode: data.postcode || '',
            prefecture: prefectureName || data.prefecture || '',
            city: data.city || '',
            street_address: data.steet_address || '',
            building_and_room_number: data.building || '',
            created_by_member_id: '',
            real_estate_number: '',
            is_active: true
        }
    });

    return newClient;
};

export const getClientDetailsService = async (client_id: string) => {
    const client = await prisma.mstClients.findUnique({
        where: withoutDeleted({ id: client_id })
    });

    if (!client) {
        throw new Error(ERROR_MESSAGES.CLIENT_NOT_FOUND);
    }

    // 都道府県名をコードに変換
    const prefectureCode = client.prefecture ? getCustomerPrefectureCodeByName(client.prefecture as any) : '';

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
        prefecture: prefectureCode || client.prefecture, // コードが見つからない場合は元の値を返す
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

    await prisma.mstClients.update({
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
            updated_by_member_id: null // クライアントの従業員が更新する場合はnull
        }
    });

    // 更新後のデータを整形されたフォーマットで返す
    return await getClientDetailsService(data.client_id);
};

export const deleteClientService = async (client_id: string) => {
    const client = await prisma.mstClients.findUnique({
        where: withoutDeleted({ id: client_id })
    });

    if (!client) {
        throw new Error(ERROR_MESSAGES.CLIENT_NOT_FOUND);
    }

    await softDeletePrisma(prisma, prisma.mstClients, { id: client_id });

    return {
        status: 'success',
        message: 'Client record soft deleted'
    };
};

export const deleteMultipleClientsService = async (clientIds: string[]) => {
    // 複数の論理削除を実行
    const deletePromises = clientIds.map(id => 
        softDeletePrisma(prisma, prisma.mstClients, { id })
    );
    
    await Promise.all(deletePromises);

    return {
        status: 'success',
        message: 'Selected client records soft deleted'
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
        where: withoutDeleted(where),
        orderBy: {
            created_at: 'desc'
        }
    });

    // 都道府県名をコードに変換
    return clients.map(client => ({
        ...client,
        prefecture: client.prefecture ? 
            getCustomerPrefectureCodeByName(client.prefecture as any) || client.prefecture : 
            client.prefecture
    }));
};
