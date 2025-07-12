import { z } from 'zod';

export const apiSignInSuccessResponseSchema = z
  .object({
    status: z.number().describe('HTTP status code of the response'),
    message: z.string().describe('Descriptive message of the API response'),
    data: z
      .object({
        client_id: z.string().describe('Unique identifier of the client'),
        client_name: z.string().describe('Full name of the client'),
        token: z
          .object({
            AccessToken: z.string().describe('JWT access token used for authentication'),
            ExpiresIn: z.number().describe('Access token expiration time in seconds'),
            TokenType: z.string().describe('Type of the token (typically "Bearer")'),
            RefreshToken: z.string().describe('Token used to obtain new access tokens'),
            IdToken: z.string().describe('Identity token containing user information'),
          })
          .describe('Authentication tokens'),
        employee_id: z.string().describe('Unique identifier of the employee'),
        type: z.string().describe('User type (e.g., member)'),
        role: z.string().describe('User role (e.g., admin)'),
      })
      .describe('Authenticated user and token details'),
  })
  .describe('Schema for successful sign-in API response');

export const checkEmailBodySchema = z.object({
  email: z.string().email().describe('Email to check if registered'),
});

export const changePasswordBodySchema = z.object({
  email: z.string().email().describe('User email'),
  oldPassword: z.string().min(6).describe('Old password'),
  newPassword: z.string().min(6).describe('New password'),
});

export const logoutHeaderSchema = z.object({
  authorization: z.string().startsWith('Bearer ').describe('Bearer token for authentication'),
});
