import { FastifyInstance } from 'fastify';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import fastifyCors from '@fastify/cors';
import fastifyMultipart from '@fastify/multipart';
import { jsonSchemaTransform } from 'fastify-type-provider-zod';

export async function registerPlugins(app: FastifyInstance): Promise<void> {
  // Swagger configuration
  await app.register(fastifySwagger, {
    openapi: {
      info: {
        title: 'Ippon Trading Backend API',
        description: 'Backend API documentation for Ippon Trading Platform',
        version: '1.0.0',
      },
      servers: [
        {
          url: `http://${process.env.SWAGGER_HOST || 'localhost:8080'}`,
          description: 'Development server'
        }
      ],
      tags: [
        { name: 'reports', description: 'Report related APIs' }
      ],
      components: {
        securitySchemes: {
          // 認証が必要な場合はここに設定
        }
      }
    },
    transform: jsonSchemaTransform
  });

  // Swagger UI configuration
  await app.register(fastifySwaggerUi, {
    routePrefix: '/documentation',
    uiConfig: {
      docExpansion: 'list',
      defaultModelsExpandDepth: 5,
      defaultModelExpandDepth: 5,
      deepLinking: true,
      displayRequestDuration: true,
      filter: true,
      tryItOutEnabled: true
    },
    staticCSP: true,
    transformSpecification: (swaggerObject) => {
      return swaggerObject;
    },
  });

  // CORS configuration
  await app.register(fastifyCors, {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  });

  // Multipart/File upload configuration
  await app.register(fastifyMultipart, {
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB
    },
  });
}