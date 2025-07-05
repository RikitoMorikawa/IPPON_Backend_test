import { FastifyInstance } from 'fastify';
import reportRoutes from '@src/routes/reportRoutes';
import propertyRoutes from './propertyRoute';
import customerRoutes from './customerRoute';
import dashboardRoutes from './dashboardRoutes';
import authRoutes from './authRoutes';
import inquiryRoutes from './inquiryRoute';
import employeeRoutes from './employeeRoute';
import clientRoutes from './clientRoute';

export function registerRoutes(app: FastifyInstance): void {
  // report routes
  app.register(reportRoutes, { prefix: '/api/v1' });
  app.register(authRoutes, { prefix: '/api/v1/' });

  // future routes
  app.register(propertyRoutes, { prefix: '/api/v1' });
  app.register(customerRoutes, { prefix: '/api/v1' });
  app.register(inquiryRoutes, { prefix: '/api/v1' });
  app.register(dashboardRoutes, { prefix: '/api/v1' });
  app.register(employeeRoutes, { prefix: '/api/v1' });
  app.register(clientRoutes, { prefix: '/api/v1' });

}
