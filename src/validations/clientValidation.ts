import { FastifyRequest, FastifyReply } from 'fastify';
import { ERROR_MESSAGES } from '../responses/constants/clientConstant';
import { GetClientsRequest, UpdateClientResponse, UpdateClientsRequest } from '@src/interfaces/clientInterfaces';

// クライアント取得APIのバリデーション
export const validateGetClient = async (
  request: FastifyRequest<GetClientsRequest>,
  reply: FastifyReply,
): Promise<void> => {

  const client_id = request.params.client_id

  // クライアントIDの必須チェック
  if (!client_id || client_id.trim() === '') {
    return reply.status(400).send({
      status: 400,
      message: ERROR_MESSAGES.CLIENT_ID_NOT_REQUIRED,
    });
  }
}

// クライアント更新APIのバリデーション
export const validateUpdateClient = async (
  request: FastifyRequest<UpdateClientsRequest>,
  reply: FastifyReply<{ Reply: UpdateClientResponse }>,
): Promise<void> => {

  const client_id = request.params.client_id
  const name = request.body.client_name

  // クライアントIDの必須チェック
  if (!client_id || client_id.trim() === '') {
    return reply.status(400).send({
      status: 400,
      message: ERROR_MESSAGES.CLIENT_ID_NOT_REQUIRED,
    });
  }
}
