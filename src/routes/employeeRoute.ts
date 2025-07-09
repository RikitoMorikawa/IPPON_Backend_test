import { FastifyPluginCallback } from 'fastify';
import { cognitoAuthMiddleware } from '../middleware/middleware';
import { employeeHandler, deleteEmployeesHandler, getEmployeeNameListHandler } from '../controllers/employeeController';
import { CustomFastifyInstance } from '../interfaces/CustomFastifyInstance';

// TypeScript型定義
interface EmployeeParams {
  id: string;
}

interface EmployeeQuery {
  limit?: string;
  page?: string;
  search?: string;
  role?: string;
}

const employeeRoutes: FastifyPluginCallback = (app, opts, done) => {
    const customApp = app as CustomFastifyInstance;

    // GET /employees/:id
    customApp.route({
        method: 'GET',
        url: '/employees/:id',
        preHandler: cognitoAuthMiddleware,
        handler: (req, reply) => employeeHandler(customApp, req, reply)
    });

    // GET /employees（一覧取得）
    customApp.route({
        method: 'GET',
        url: '/employees',
        preHandler: cognitoAuthMiddleware,
        handler: (req, reply) => employeeHandler(customApp, req, reply)
    });

    // POST /employees
    customApp.route({
        method: 'POST',
        url: '/employees',
        preHandler: cognitoAuthMiddleware,
        handler: (req, reply) => employeeHandler(customApp, req, reply)
    });

    // PUT /employees/:id
    customApp.route({
        method: 'PUT',
        url: '/employees/:id',
        preHandler: cognitoAuthMiddleware,
        handler: (req, reply) => employeeHandler(customApp, req, reply)
    });

    // DELETE /employees/:id
    customApp.route({
        method: 'DELETE',
        url: '/employees/:id',
        preHandler: cognitoAuthMiddleware,
        handler: (req, reply) => deleteEmployeesHandler(customApp, req, reply)
    });

    // GET /employees/names-list（名前一覧取得）
    customApp.route({
        method: 'GET',
        url: '/employees/names-list',
        preHandler: cognitoAuthMiddleware,
        handler: (req, reply) => getEmployeeNameListHandler(customApp, req, reply)
    });

    done();
};

export default employeeRoutes;