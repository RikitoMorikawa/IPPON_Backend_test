import { createApp } from '@src/server';
import { FastifyInstance } from 'fastify';
import dotenv from 'dotenv';
import { registerComponents } from './services/componentsService';
import config from './config';
// import { updateAccessTokenDuration } from './utils/cognitoUtils';

dotenv.config();

const appSingleton = (() => {
  let instance: FastifyInstance | null = null;

  return {
    getInstance: async (): Promise<FastifyInstance> => {
      if (!instance) {
        instance = await createApp();
      }
      return instance;
    },
  };
})();

const startServer = async (): Promise<void> => {
  try {
    const app = await appSingleton.getInstance();
    // await updateAccessTokenDuration();

    await app.listen({ port: config.server.port, host: config.server.host });
    registerComponents(app);
    console.log(`✅ Server running at http://${config.server.host}:${config.server.port}`);
    console.log(`📚 API Documentation available at http://${config.server.host}:${config.server.port}/documentation`);
    console.log('🔍 Current Environment:', config.environment);
  } catch (err) {
    console.error('❌ Error starting server:', err);
    process.exit(1);
  }
};

if (require.main === module) {
  startServer();
}

export const getApp = async (): Promise<FastifyInstance> => {
  return appSingleton.getInstance();
};
