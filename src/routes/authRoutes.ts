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
import { validateSignIn, validateSendOtp, validateVerifyOtp, validateResetPassword, validatecheckEmail } from '@src/validations/authValidation';
import { SignRequestBody, SignInResponse } from '@src/interfaces/authInterfaces';

export default async function authRoutes(fastify: FastifyInstance): Promise<void> {
  const app = fastify;

  app.route<{
    Body: SignRequestBody;
    Reply: SignInResponse;
  }>({
    method: 'POST',
    url: '/auth/signin',
    preValidation: [validateSignIn],
    handler: signInController,
  });

  app.route({
    method: 'POST',
    url: '/auth/otp',
    preValidation: [validateSendOtp],
    handler: sendOtpController,
  });

  app.route({
    method: 'POST',
    url: '/auth/verify-otp',
    preValidation: [validateVerifyOtp],
    handler: verifyOtpController,
  });

  app.route({
    method: 'POST',
    url: '/auth/reset-password',
    preValidation: [validateResetPassword],
    handler: ResetPasswordController,
  });

  app.route({
    method: 'POST',
    url: '/auth/check-email',
    preValidation: [validatecheckEmail],
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
        message: result.message,
      };
    },
  });

  app.route({
    method: 'POST',
    url: '/auth/email/change-password',
    handler: changeEmailPassword,
  });
}
