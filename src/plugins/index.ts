import { FastifyInstance } from 'fastify';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import fastifyCors from '@fastify/cors';
import fastifyMultipart from '@fastify/multipart';
import { jsonSchemaTransform } from 'fastify-type-provider-zod';
import dynamoDbPlugin from './dynamoDbPlugin';
import tenantPlugin from './tenantPlugin';
import config from '../config';

export async function registerPlugins(app: FastifyInstance): Promise<void> {
  app.register(dynamoDbPlugin);
  app.register(tenantPlugin);
  await app.register(fastifySwagger, {
    openapi: {
      info: {
        title: 'Ippon Trading Backend API',
        description: 'Backend API documentation for Ippon Trading Platform',
        version: '1.0.0',
      },
      servers: [
        {
          url: config.frontend.baseUrl,
          description: `${config.environment} server`,
        },
      ],
      tags: [
        { name: 'auth', description: 'Authentication related APIs' },
        { name: 'reports', description: 'Report related APIs' },
        { name: 'properties', description: 'Property related APIs' },
        { name: 'customers', description: 'Customer related APIs' },
        { name: 'inquiries', description: 'Inquiry related APIs' },
        { name: 'employees', description: 'Employee related APIs' },
        { name: 'clients', description: 'Client related APIs' },
        { name: 'dashboard', description: 'Dashboard related APIs' }
      ],
      components: {
        securitySchemes: {},
      },
    },
    transform: jsonSchemaTransform,
  });

  await app.register(fastifySwaggerUi, {
    routePrefix: '/documentation',
    uiConfig: {
      docExpansion: 'list',
      defaultModelsExpandDepth: 5,
      defaultModelExpandDepth: 5,
      deepLinking: true,
      displayRequestDuration: true,
      filter: true,
      tryItOutEnabled: true,
    },
    staticCSP: false,
    transformStaticCSP: (header) => {
      return header.replace("style-src 'self' https:", "style-src 'self' https: 'unsafe-inline'");
    },
    transformSpecification: (swaggerObject) => {
      return swaggerObject;
    },
  });

  // CORS設定は middleware.ts で統一管理

  await app.register(fastifyMultipart, {
    limits: {
      fileSize: 5 * 1024 * 1024,
    },
  });
}
