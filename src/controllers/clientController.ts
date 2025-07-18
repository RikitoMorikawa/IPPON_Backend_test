import { FastifyRequest, FastifyReply } from 'fastify';
import { CustomFastifyInstance } from '../interfaces/CustomFastifyInstance';
import { getClientDetailsService, updateClientService  } from '../services/clientService';
import { errorResponse, NotFoundError, successResponse, ValidationError } from '../responses';
import { SUCCESS_MESSAGES, ERROR_MESSAGES } from '../responses/constants/clientConstant';
import { getType } from '../middleware/userContext';
import { GetClientResponse, GetClientsRequest, UpdateClientResponse, UpdateClientsRequest } from '@src/interfaces/clientInterfaces';

// GET /clients/:client_id
export const getClientsController = async (
  app: CustomFastifyInstance,
  request: FastifyRequest<GetClientsRequest>,
  reply: FastifyReply<{ Reply: GetClientResponse }>,
): Promise<void> => {

  try {
    const client_id = request.params.client_id;

    const client = await getClientDetailsService(client_id);

    if (!client) {
        return reply.status(404).send(errorResponse(404, ERROR_MESSAGES.CLIENT_NOT_FOUND));
    }

    return reply.status(200).send(successResponse(200, SUCCESS_MESSAGES.SUCCESS_CLIENT_RETRIEVE, client));

  } catch (error: any) {
    sendError(reply, error)
  }
};

// クライアント更新API
export const updateClientController = async (
  app: CustomFastifyInstance,
  request: FastifyRequest<UpdateClientsRequest>,
  reply: FastifyReply<{ Reply: UpdateClientResponse }>,
): Promise<void> => {
  try {
    const client_id = request.params.client_id;

    const body = request.body;
    body.client_id = client_id;
    const updatedClient = await updateClientService(body);
    return reply.status(200).send(successResponse(200, SUCCESS_MESSAGES.SUCCESS_CLIENT_UPDATE, updatedClient));
  } catch (error: any) {
    return sendError(reply, error)
  }
};

const sendError = (reply: FastifyReply, error: any) => {
  console.error('Error in clientHandler:', error);
  if (error instanceof NotFoundError) {
      return reply.status(404).send(errorResponse(404, error.message));
  }
  if (error instanceof ValidationError) {
      return reply.status(400).send(errorResponse(400, error.message));
  }
  return reply.status(500).send(errorResponse(500, ERROR_MESSAGES.SERVER_ERROR));
}