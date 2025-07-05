import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface ClientData {
  client_name: string;
  agent_name: string;
}

/**
 * クライアントIDからクライアント情報と担当者情報を取得
 */
export const getClientDataByClientId = async (clientId: string): Promise<ClientData | null> => {
  try {
    // クライアント情報を取得
    const client = await prisma.mstClients.findUnique({
      where: {
        id: clientId,
        is_active: true,
      },
      select: {
        name: true,
        employees: {
          where: {
            is_active: true,
          },
          select: {
            first_name: true,
            last_name: true,
          },
          take: 1, // 最初の担当者を取得
        },
      },
    });

    if (!client) {
      return null;
    }

    // 担当者名を構築（姓+名）
    const agent = client.employees[0];
    const agentName = agent ? `${agent.last_name}${agent.first_name}` : '';

    return {
      client_name: client.name,
      agent_name: agentName,
    };
  } catch (error) {
    console.error('Error fetching client data:', error);
    throw error;
  }
};

/**
 * 従業員のメールアドレスからクライアント情報と担当者情報を取得
 */
export const getClientDataByEmployeeEmail = async (email: string): Promise<ClientData | null> => {
  try {
    const employee = await prisma.mstClientEmployees.findFirst({
      where: {
        mail_address: email,
        is_active: true,
      },
      include: {
        client: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!employee || !employee.client) {
      return null;
    }

    return {
      client_name: employee.client.name,
      agent_name: `${employee.last_name}${employee.first_name}`,
    };
  } catch (error) {
    console.error('Error fetching client data by employee email:', error);
    throw error;
  }
}; 