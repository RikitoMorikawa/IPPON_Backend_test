import Fastify, { FastifyInstance } from 'fastify';
import { registerPlugins } from '@src/plugins';
import { registerRoutes } from '@src/routes';
import { errorHandler } from '@src/errors/errorHandler';
import { ZodTypeProvider, serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';
import { registerComponents } from './services/componentsService';
import { registerMiddlewares } from '@src/middleware/middleware';

export async function createApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || 'info',
      transport: {
        target: 'pino-pretty',
        options: {
          translateTime: 'HH:MM:ss Z',
          ignore: 'pid,hostname',
        },
      },
    },
    pluginTimeout: 30000, // 30 seconds for DynamoDB initialization
  }).withTypeProvider<ZodTypeProvider>();

  // Set up compiler for Zod schema validation
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  // Register error handler
  app.setErrorHandler(errorHandler);

  // Register plugins
  await registerPlugins(app);

  // Register middlewares (including CORS)
  await registerMiddlewares(app);

  // Register routes
  registerRoutes(app);

  // Health check endpoint
  app.get('/health', async () => {
    return { status: 'ok' };
  });

  return app;
}
