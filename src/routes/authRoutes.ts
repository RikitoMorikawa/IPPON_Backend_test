import { FastifyInstance } from 'fastify';
import {
  changeEmailPassword,
  changePasswordController,
  checkEmailController,
  logoutController,
  ResetPasswordController,
  sendChangePasswordEmail,
  sendOtpController,
  signInController,
  verifyOtpController,
} from '@src/controllers/authController';
import { cognitoAuthMiddleware } from '@src/middleware/middleware';

export default async function authRoutes(fastify: FastifyInstance): Promise<void> {
  const app = fastify;

  app.route({
    method: 'POST',
    url: '/auth/signin',
    handler: signInController,
  });

  app.route({
    method: 'POST',
    url: '/auth/otp',
    handler: sendOtpController,
  });

  app.route({
    method: 'POST',
    url: '/auth/verify-otp',
    handler: verifyOtpController,
  });

  app.route({
    method: 'POST',
    url: '/auth/reset-password',
    handler: ResetPasswordController,
  });

  app.route({
    method: 'POST',
    url: '/auth/check-email',
    handler: checkEmailController,
  });

  app.route({
    method: 'POST',
    url: '/auth/change-password',
    preHandler: [cognitoAuthMiddleware],
    handler: changePasswordController,
  });

  app.route({
    method: 'POST',
    url: '/auth/logout',
    preHandler: [cognitoAuthMiddleware],
    handler: logoutController,
  });

  app.route({
    method: 'POST',
    url: '/auth/sent-email',
    handler: async (req, reply) => {
      const result = await sendChangePasswordEmail(req, reply);
      return {
        status: result.success ? 200 : 400,
        message: result.message
      };
    },
  });

  app.route({
    method: 'POST',
    url: '/auth/email/change-password',
    handler: changeEmailPassword,
  });
}
