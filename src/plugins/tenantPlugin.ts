import { FastifyPluginAsync, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import { getClientId } from '../middleware/userContext';

declare module 'fastify' {
  interface FastifyRequest {
    tenantId?: string;
  }
}

const tenantPlugin: FastifyPluginAsync = async (fastify) => {
  // すべての認証済みリクエストにテナントIDを追加するフック
  fastify.addHook('preHandler', async (request: FastifyRequest, reply) => {
    // 認証ミドルウェアが実行された後のみ実行
    if ((request as any).user) {
      try {
        const clientId = getClientId(request);
        request.tenantId = clientId;
        
        // ログ出力（デバッグ用）
        fastify.log.debug(`Tenant ID set for request: ${clientId}`);
      } catch (error) {
        // ユーザーコンテキストが不完全な場合はスキップ
        // 一部のエンドポイント（ヘルスチェックなど）では認証が不要
        fastify.log.debug('Could not extract tenant ID from request', error);
      }
    }
  });
};

export default fp(tenantPlugin, {
  name: 'tenant-plugin',
  dependencies: []
}); 