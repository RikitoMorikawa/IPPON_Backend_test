import { FastifyInstance } from 'fastify';
import reportRoutes from '@src/routes/reportRoutes';

export function registerRoutes(app: FastifyInstance): void {
  // report routes
  app.register(reportRoutes, { prefix: '/api/v1' });
  
  // future routes
}