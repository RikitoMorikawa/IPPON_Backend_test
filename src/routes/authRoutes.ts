import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import {
  signInBodySchema,
  sendOtpBodySchema,
  verifyOtpBodySchema,
  apiSignInSuccessResponseSchema,
  resetPasswordBodySchema,
  checkEmailBodySchema,
  changePasswordBodySchema,
  logoutHeaderSchema,
} from '@src/schemas/authSchema';
import {
  apiBadRequestErrorResponseSchema,
  apiServerErrorResponseSchema,
  apiValidationErrorResponseSchema,
  apiSuccessResponseSchema,
} from '@src/schemas/responseSchema';
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
import { z } from 'zod';

export default async function authRoutes(fastify: FastifyInstance): Promise<void> {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  app.route({
    method: 'POST',
    url: '/auth/signin',
    schema: {
      description: 'Sign in with email and password',
      tags: ['auth'],
      summary: 'User SignIn',
      body: signInBodySchema,
      response: {
        200: apiSignInSuccessResponseSchema,
        400: apiBadRequestErrorResponseSchema,
        422: apiValidationErrorResponseSchema,
        500: apiServerErrorResponseSchema,
      },
    },
    handler: signInController,
  });

  app.route({
    method: 'POST',
    url: '/auth/otp',
    schema: {
      description: 'Send OTP to user email',
      tags: ['auth'],
      summary: 'Send OTP for password reset',
      body: sendOtpBodySchema,
      response: {
        200: apiSuccessResponseSchema,
        400: apiBadRequestErrorResponseSchema,
        422: apiValidationErrorResponseSchema,
        500: apiServerErrorResponseSchema,
      },
    },
    handler: sendOtpController,
  });

  app.route({
    method: 'POST',
    url: '/auth/verify-otp',
    schema: {
      description: 'Verify OTP sent to user email',
      tags: ['auth'],
      summary: 'Verify OTP for password reset',
      body: verifyOtpBodySchema,
      response: {
        200: apiSuccessResponseSchema,
        400: apiBadRequestErrorResponseSchema,
        422: apiValidationErrorResponseSchema,
        500: apiServerErrorResponseSchema,
      },
    },
    handler: verifyOtpController,
  });

  app.route({
    method: 'POST',
    url: '/auth/reset-password',
    schema: {
      description: 'Reset password using verification code from email',
      tags: ['auth'],
      summary: 'Reset password',
      body: resetPasswordBodySchema,
      response: {
        200: apiSuccessResponseSchema,
        400: apiBadRequestErrorResponseSchema,
        422: apiValidationErrorResponseSchema,
        500: apiServerErrorResponseSchema,
      },
    },
    handler: ResetPasswordController,
  });

  app.route({
    method: 'POST',
    url: '/auth/check-email',
    schema: {
      description: 'Check if email is registered',
      tags: ['auth'],
      summary: 'Check email existence',
      body: checkEmailBodySchema,
      response: {
        200: apiSuccessResponseSchema,
        400: apiBadRequestErrorResponseSchema,
        422: apiValidationErrorResponseSchema,
        500: apiServerErrorResponseSchema,
      },
    },
    handler: checkEmailController,
  });

  app.route({
    method: 'POST',
    url: '/auth/change-password',
    preHandler: [cognitoAuthMiddleware],
    schema: {
      description: 'Change password using old password and new password',
      tags: ['auth'],
      summary: 'Change user password',
      body: changePasswordBodySchema,
      response: {
        200: apiSuccessResponseSchema,
        400: apiBadRequestErrorResponseSchema,
        422: apiValidationErrorResponseSchema,
        500: apiServerErrorResponseSchema,
      },
    },
    handler: changePasswordController,
  });

  app.route({
    method: 'POST',
    url: '/auth/logout',
    preHandler: [cognitoAuthMiddleware],
    schema: {
      description: 'Logout user using Authorization token',
      tags: ['auth'],
      summary: 'Logout user',
      headers: logoutHeaderSchema,
      response: {
        200: apiSuccessResponseSchema,
        400: apiBadRequestErrorResponseSchema,
        422: apiValidationErrorResponseSchema,
        500: apiServerErrorResponseSchema,
      },
    },
    handler: logoutController,
  });

  app.route({
    method: 'POST',
    url: '/auth/sent-email',
    schema: {
      tags: ['auth'],
      summary: 'sent email',
      headers: logoutHeaderSchema,
      response: {
        200: apiSuccessResponseSchema,
        400: apiBadRequestErrorResponseSchema,
        422: apiValidationErrorResponseSchema,
        500: apiServerErrorResponseSchema,
      },
    },
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
    schema: {
      tags: ['auth'],
      summary: 'Change Password',
      headers: logoutHeaderSchema,
      body: z.object({
        email: z.string().describe('Email address'),
        iv: z.string().describe('Initialization vector'),
        oldPassword: z.string().describe('Current password'),
        newPassword: z.string().describe('New password')
      }),
      response: {
        200: apiSuccessResponseSchema,
        400: apiBadRequestErrorResponseSchema,
        422: apiValidationErrorResponseSchema,
        500: apiServerErrorResponseSchema,
      },
    },
    handler: changeEmailPassword,
  });
}
