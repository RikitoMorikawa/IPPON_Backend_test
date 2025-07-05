import { createApp } from '@src/server';
import { FastifyInstance } from 'fastify';
import dotenv from 'dotenv';

dotenv.config();

const appSingleton = (() => {
  let instance: FastifyInstance | null = null;
  
  return {
    getInstance: async (): Promise<FastifyInstance> => {
      if (!instance) {
        instance = await createApp();
      }
      return instance;
    }
  };
})();

const startServer = async (): Promise<void> => {
  try {
    const app = await appSingleton.getInstance();
    const PORT = Number(process.env.PORT) || 8080;
    const HOST = process.env.HOST || '0.0.0.0';

    await app.listen({ port: PORT, host: HOST });
    console.log(`✅ Server running at http://${HOST}:${PORT}`);
    console.log(`📚 API Documentation available at http://${HOST}:${PORT}/documentation`);
    console.log("🔍 Current Environment:", process.env.NODE_ENV);
  } catch (err) {
    console.error('❌ Error starting server:', err);
    process.exit(1);
  }
};

// if this file is executed directly, start the server
if (require.main === module) {
  startServer();
}

export const getApp = async (): Promise<FastifyInstance> => {
  return appSingleton.getInstance();
};