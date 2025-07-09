import { FastifyPluginCallback } from 'fastify';
import { clientHandler } from '../controllers/clientController';
import { cognitoAuthMiddleware } from '../middleware/middleware';
import { CustomFastifyInstance } from '../interfaces/CustomFastifyInstance';

// TypeScript型定義
interface ClientParams {
  client_id: string;
}

interface ClientQuery {
  limit?: string;
  page?: string;
  search?: string;
  sort?: string;
}

const clientRoutes: FastifyPluginCallback = (app, opts, done) => {
    const customApp = app as CustomFastifyInstance;

    // GET /clients/:client_id
    customApp.route({
        method: 'GET',
        url: '/clients/:client_id',
        preHandler: cognitoAuthMiddleware,
        handler: (req, reply) => clientHandler(customApp, req, reply)
    });

    // GET /clients（一覧取得）
    customApp.route({
        method: 'GET',
        url: '/clients',
        preHandler: cognitoAuthMiddleware,
        handler: (req, reply) => clientHandler(customApp, req, reply)
    });

    // POST /clients
    customApp.route({
        method: 'POST',
        url: '/clients',
        preHandler: cognitoAuthMiddleware,
        handler: (req, reply) => clientHandler(customApp, req, reply)
    });

    // PUT /clients/:client_id
    customApp.route({
        method: 'PUT',
        url: '/clients/:client_id',
        preHandler: cognitoAuthMiddleware,
        handler: (req, reply) => clientHandler(customApp, req, reply)
    });

    // DELETE /clients/:client_id
    customApp.route({
        method: 'DELETE',
        url: '/clients/:client_id',
        preHandler: cognitoAuthMiddleware,
        handler: (req, reply) => clientHandler(customApp, req, reply)
    });

    done();
};

export default clientRoutes;
