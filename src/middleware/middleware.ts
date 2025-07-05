import { FastifyRequest, FastifyReply, FastifyInstance } from 'fastify';
import fastifyCors from '@fastify/cors';
import logger from '@src/utils/logger';
import { jwtDecode } from 'jwt-decode';
import config from '../config';

export const cognitoAuthMiddleware = async (request: FastifyRequest, reply: FastifyReply) => {
  const token = request.headers['authorization']?.split(' ')[1];

  if (!token) {
    return reply.status(401).send({ error: 'Token is required' });
  }

  try {
    const decoded: any = jwtDecode(token);
    (request as any).user = {
      ...decoded,
      client_id: decoded['custom:clientId']
    };
  } catch (err: any) {
    return reply.status(401).send({ error: 'Unauthorized', message: err.message });
  }
};

export const registerMiddlewares = async (app: FastifyInstance) => {
  // multipartは plugins/index.ts で登録済みのため、ここでは削除
  await app.register(fastifyCors, {
    origin: (origin, callback) => {
      console.log('🔍 CORS Request from origin:', origin);
      
      // リクエストにoriginがない場合（同一オリジン）は許可
      if (!origin) return callback(null, true);
      
      // 許可されたオリジンかチェック
      if (config.frontend.urls.includes(origin)) {
        console.log('✅ CORS: Origin allowed:', origin);
        return callback(null, true);
      }
      
      console.log('❌ CORS: Origin rejected:', origin);
      console.log('📝 CORS: Allowed origins:', config.frontend.urls);
      return callback(new Error('Not allowed by CORS'), false);
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Cache-Control',
      'X-Requested-With',
      'Accept',
      'Origin',
      'X-Api-Key',
    ],
    credentials: true,
  });

  // CORSチェックは上記のorigin関数で処理するため、このフックは削除
};
