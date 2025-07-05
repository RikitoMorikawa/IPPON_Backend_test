import { FastifyRequest, FastifyReply } from 'fastify';
import { CustomFastifyInstance } from '../interfaces/CustomFastifyInstance';
import { createClientService, getClientDetailsService, updateClientService, deleteMultipleClientsService, getAllClients, deleteClientService } from '../services/clientService';
import { errorResponse, NotFoundError, successResponse, ValidationError } from '../responses';
import { SUCCESS_MESSAGES, ERROR_MESSAGES } from '../responses/constants/clientConstant';
import { getType } from '../middleware/userContext';

export const clientHandler = async (
    app: CustomFastifyInstance,
    req: FastifyRequest,
    reply: FastifyReply
): Promise<void> => {
    try {
        const type = getType(req);

        switch (req.method) {
            case 'POST': {
                const body = req.body as any;
                const clientInfo = await createClientService(body);
                return reply.status(201).send(successResponse(201, SUCCESS_MESSAGES.CREATE_CLIENT, clientInfo));
            }

            case 'GET': {
                const client_id = req.params && (req.params as any).client_id;
                const { keyword } = req.query as { keyword?: string };

                if (client_id) {
                    const client = await getClientDetailsService(client_id);
                    if (!client) {
                        return reply.status(404).send(errorResponse(404, ERROR_MESSAGES.CLIENT_NOT_FOUND));
                    }
                    return reply.status(200).send(successResponse(200, SUCCESS_MESSAGES.SUCCESS_CLIENT_RETRIEVE, client));
                } else {
                    const clients = await getAllClients(keyword);
                    return reply.status(200).send(successResponse(200, SUCCESS_MESSAGES.SUCCESS_CLIENT_RETRIEVE, clients));
                }
            }

            case 'PUT': {
                const client_id = req.params && (req.params as any).client_id;
                if (!client_id) {
                    return reply.status(400).send(errorResponse(400, ERROR_MESSAGES.REQUIRED_ID_ERROR));
                }
                const body = req.body as any;
                body.client_id = client_id;
                const updatedClient = await updateClientService(body);
                return reply.status(200).send(successResponse(200, SUCCESS_MESSAGES.SUCCESS_CLIENT_UPDATE, updatedClient));
            }

            case 'DELETE': {
                const client_id = req.params && (req.params as any).client_id;
                if (client_id) {
                    const result = await deleteClientService(client_id);
                    return reply.status(200).send(successResponse(200, SUCCESS_MESSAGES.SUCCESS_CLIENT_DELETE, result));
                } else {
                    const body = req.body as { client_ids: string[] };
                    if (!body.client_ids || !Array.isArray(body.client_ids)) {
                        return reply.status(400).send(errorResponse(400, ERROR_MESSAGES.REQUIRE_PARAMETERS));
                    }
                    const result = await deleteMultipleClientsService(body.client_ids);
                    return reply.status(200).send(successResponse(200, SUCCESS_MESSAGES.SUCCESS_CLIENT_DELETE, result));
                }
            }

            default:
                return reply.status(405).send(errorResponse(405, ERROR_MESSAGES.METHOD_NOT_ALLOWED_ERROR));
        }
    } catch (error: any) {
        console.error('Error in clientHandler:', error);
        if (error instanceof NotFoundError) {
            return reply.status(404).send(errorResponse(404, error.message));
        }
        if (error instanceof ValidationError) {
            return reply.status(400).send(errorResponse(400, error.message));
        }
        return reply.status(500).send(errorResponse(500, ERROR_MESSAGES.SERVER_ERROR));
    }
};
