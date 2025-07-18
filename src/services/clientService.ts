import { PrismaClient } from '@prisma/client';
import { ERROR_MESSAGES } from '../responses/constants/clientConstant';
import { Client, UpdateClientRequestBody } from '../interfaces/clientInterfaces';
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

export const getClientDetailsService = async (client_id: string) => {
    const client = await prisma.mstClients.findUnique({
        where: withoutDeleted({ id: client_id })
    });

    if (!client) {
      return null
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
    } as Client;
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
