import { FastifyPluginCallback } from 'fastify';
import { getClientsController, updateClientController } from '../controllers/clientController';
import { cognitoAuthMiddleware } from '../middleware/middleware';
import { CustomFastifyInstance } from '../interfaces/CustomFastifyInstance';
import { GetClientParams, GetClientResponse, UpdateClientRequestBody, UpdateClientRequestParams, UpdateClientResponse, UpdateClientsRequest } from '@src/interfaces/clientInterfaces';
import { validateGetClient, validateUpdateClient } from '@src/validations/clientValidation';

const clientRoutes: FastifyPluginCallback = (app, opts, done) => {
    const customApp = app as CustomFastifyInstance;

    // GET /clients/:client_id
    customApp.route<{
      Params: GetClientParams;
      Reply: GetClientResponse;
    }>({
      method: 'GET',
      url: '/clients/:client_id',
      preValidation:[validateGetClient],
      preHandler: cognitoAuthMiddleware,
      handler: (request, reply) => getClientsController(customApp, request, reply)
    });

    // PUT /clients/:client_id
    customApp.route<{
      Params: UpdateClientRequestParams;
      Body: UpdateClientRequestBody;
      Reply: UpdateClientResponse;
    }>({
        method: 'PUT',
        url: '/clients/:client_id',
        preValidation: [validateUpdateClient],
        preHandler: cognitoAuthMiddleware,
        handler: (request, reply) => updateClientController(customApp, request, reply)
    });

    done();
};

export default clientRoutes;
