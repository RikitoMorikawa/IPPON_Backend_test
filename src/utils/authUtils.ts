import { getClientId } from '@src/middleware/userContext';
import { FastifyRequest } from 'fastify';

export const getClientIdFromToken = async (request: FastifyRequest): Promise<string> => {
    const clientId = await getClientId(request);
    if (!clientId) {
        throw new Error('Client ID not found in request');
    }
    return clientId;
}; 