import { z } from 'zod';
import { FastifyReply, FastifyRequest } from 'fastify';
import dotenv from 'dotenv';
import { checkEmailExists } from '@src/repositroies/authModel';
import { changePasswordSeriveInCognito, changeUserPasswordSeriveInCognito, LogoutService, ResetPasswordService, sendOtpService, signInService } from '../services/authService';
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from '../responses/constants/authConstant';
import { changePasswordBodySchema} from '@src/schemas/authSchema';
import { BadRequestError, NotFoundError } from '@src/errors/httpErrors';
import { decryptEmail, encryptEmail } from '@src/utils/crypto';
import { constructEmailContentforMember, sendEmailWithSES } from '@src/services/emailService';
import { errorResponse, successResponse } from '@src/responses';
import { authLogger } from '@src/utils/logger';
import { SendOtpRequestBody, SignRequestBody, SignInResponse, VerifyOtpRequestBody, ResetPasswordRequestBody, CheckEmailRequestBody } from '@src/interfaces/authInterfaces';

dotenv.config();

export const signInController = async (
  request: FastifyRequest<{
    Body: SignRequestBody;
  }>,
  reply: FastifyReply<{ Reply: SignInResponse }>,
): Promise<void> => {
  const { email, password } = request.body;

  try {
    authLogger.info('Email exists, proceeding with sign-in service', email);
    const result = await signInService(email, password);

    if (!result) {
      authLogger.error('Sign-in service returned null result', null, email);
      throw {
        statusCode: 400,
        message: ERROR_MESSAGES.SIGNIN_FAILED
      };
    }

    authLogger.info('Sign-in controller completed successfully', email, {
      hasToken: !!result.data?.token
    });

    const response: SignInResponse = {
      status: 200,
      message: SUCCESS_MESSAGES.SIGNIN_SUCCESS,
      data: result.data
    };

    reply.code(200).send(response);
  } catch (error: any) {
    authLogger.error('Sign-in controller failed', error, email, {
      statusCode: error.statusCode,
      requestIP: request.ip
    });
    throw error;
  }
};



export const sendOtpController = async (
  request: FastifyRequest<{
    Body: SendOtpRequestBody;
  }>,
  reply: FastifyReply
): Promise<void> => {
  const { email } = request.body;

  try {
    authLogger.info('Email exists, sending OTP', email);
    await sendOtpService(email);

    authLogger.info('Send OTP controller completed successfully', email);

    reply.code(200).send({
      status: 200,
      message: SUCCESS_MESSAGES.OTP_SEND_SUCCESS
    });
  } catch (error: any) {
    authLogger.error('Send OTP controller failed', error, email, {
      requestIP: request.ip
    });
    throw error;
  }
};


export const verifyOtpController = async (
  request: FastifyRequest<{
    Body: VerifyOtpRequestBody;
  }>,
  reply: FastifyReply
): Promise<void> => {
  const { email, otp } = request.body;

  authLogger.info('Verify OTP request received', email, {
    otpLength: otp.length,
    requestIP: request.ip
  });

  try {
    reply.code(200).send({
      status: 200,
      message: 'OTP received. Please proceed to reset password with the same OTP code.'
    });
  } catch (error: any) {
    authLogger.error('Verify OTP controller failed', error, email, {
      otpLength: otp.length,
      requestIP: request.ip
    });
    throw error;
  }
};

export const ResetPasswordController = async (
  request: FastifyRequest<{
    Body: ResetPasswordRequestBody;
  }>,
  reply: FastifyReply
): Promise<void> => {
  const { email, verificationCode, newPassword } = request.body;

  try {
    authLogger.info('Email exists, proceeding with password reset', email);
    await ResetPasswordService(email, verificationCode, newPassword);

    authLogger.info('Reset password controller completed successfully', email);

    reply.code(200).send({
      status: 200,
      message: SUCCESS_MESSAGES.RESET_PASSWORD_SUCCESS
    });
  } catch (cognitoError: any) {
    authLogger.error('Reset password controller failed', cognitoError, email, {
      requestIP: request.ip
    });
    throw new BadRequestError(
      cognitoError.message || ERROR_MESSAGES.NOT_MET_VERIFICATION_CODE_REQUIREMENTS
    );
  }
};

export const checkEmailController = async (
  request: FastifyRequest<{
    Body: CheckEmailRequestBody;
  }>,
  reply: FastifyReply
): Promise<void> => {
  const { email } = request.body;

  authLogger.info('Check email request received', email, {
    requestIP: request.ip
  });

  try {
    authLogger.info('Email check completed successfully', email, { exists: true });

    reply.code(200).send({
      status: 200,
      message: SUCCESS_MESSAGES.EMAIL_EXISTS
    });
  } catch (error: any) {
    authLogger.error('Check email controller failed', error, email, {
      requestIP: request.ip
    });
    throw error;
  }
};


export const changePasswordController = async (
  req: FastifyRequest<{ Body: z.infer<typeof changePasswordBodySchema> }>,
  reply: FastifyReply
): Promise<void> => {
  const { email, oldPassword, newPassword } = req.body;
  const { iv } = req.body as any;

  authLogger.info('Change password request received', email, {
    oldPasswordLength: oldPassword?.length,
    newPasswordLength: newPassword?.length,
    requestIP: req.ip,
    hasIv: !!iv
  });

  if (!email || !oldPassword || !newPassword) {
    authLogger.warn('Missing required fields for password change', email, {
      hasEmail: !!email,
      hasOldPassword: !!oldPassword,
      hasNewPassword: !!newPassword
    });
    throw new BadRequestError(ERROR_MESSAGES.EMAIL_PASSWORD_REQUIRED);
  }
  let actualEmail = email;

  try {
    if (iv && email.length > 50) {
      try {
        authLogger.info('Attempting to decrypt email', undefined, { emailLength: email.length });
        actualEmail = decryptEmail(email, iv);
        authLogger.info('Email decrypted successfully', actualEmail);
      } catch (decryptError) {
        authLogger.error('Failed to decrypt email', decryptError);
        throw new BadRequestError('Invalid email encryption parameters');
      }
    }

    const emailExists = await checkEmailExists(actualEmail);
    if (!emailExists) {
      authLogger.warn('Email not found for password change', actualEmail);
      throw new NotFoundError(ERROR_MESSAGES.NOT_REGISTER_EMAIL);
    }

    authLogger.info('Email exists, proceeding with password change', actualEmail);
    await changePasswordSeriveInCognito(actualEmail, oldPassword, newPassword);

    authLogger.info('Change password controller completed successfully', actualEmail);

    reply.code(200).send({
      status: 200,
      message: SUCCESS_MESSAGES.CHANGE_PASSWORD_SUCCESS
    });
  } catch (error: any) {
    authLogger.error('Change password controller failed', error, actualEmail, {
      requestIP: req.ip
    });
    throw {
      statusCode: 500,
      message: error.message || ERROR_MESSAGES.PASSWORD_CHANGE_FAILED
    };
  }
};


export const logoutController = async (
  req: FastifyRequest,
  reply: FastifyReply
): Promise<void> => {
  const authHeader = req.headers.authorization;

  authLogger.info('Logout request received', undefined, {
    hasAuthHeader: !!authHeader,
    requestIP: req.ip
  });

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    authLogger.warn('Missing or invalid authorization header for logout', undefined, {
      authHeaderPresent: !!authHeader,
      startsWithBearer: authHeader?.startsWith('Bearer ')
    });
    throw {
      statusCode: 400,
      message: ERROR_MESSAGES.AUTHORIZATION_HEADER_REQUIRED
    };
  }

  const accessToken = authHeader.split(' ')[1];

  try {
    authLogger.info('Proceeding with logout service');
    const logoutResult = await LogoutService(accessToken);

    if (!logoutResult) {
      authLogger.error('Logout service returned false', null, undefined);
      throw {
        statusCode: 400,
        message: ERROR_MESSAGES.LOGOUT_FAILED
      };
    }

    authLogger.info('Logout controller completed successfully');

    reply.code(200).send({
      status: 200,
      message: SUCCESS_MESSAGES.LOGOUT_SUCCESS
    });
  } catch (error: any) {
    authLogger.error('Logout controller failed', error, undefined, {
      requestIP: req.ip
    });
    throw error;
  }
};


export const sendChangePasswordEmail = async (
  req: FastifyRequest,
  reply: FastifyReply
): Promise<{ success: boolean; message: string }> => {
  const { email } = req?.body as any || {};

  authLogger.info('Send change password email request received', email, {
    requestIP: req.ip
  });

  try {
    const { encryptedData, iv } = encryptEmail(email);
    const htmlContent = constructEmailContentforMember(encryptedData, iv);

    authLogger.info('Sending change password email', email);
    await sendEmailWithSES(email, htmlContent, 'Change Your Password');

    authLogger.info('Change password email sent successfully', email);

    return {
      success: true,
      message: SUCCESS_MESSAGES.EMAIL_SENT,
    };
  } catch (error: unknown) {
    authLogger.error('Failed to send change password email', error, email, {
      requestIP: req.ip
    });
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to send email',
    };
  }
};



export const changeEmailPassword = async (
  req: FastifyRequest,
  reply: FastifyReply
): Promise<void> => {
  const { email, iv, oldPassword, newPassword } = req.body as {
    email: string;
    iv: string;
    oldPassword: string;
    newPassword: string;
  };

  authLogger.info('Change email password request received', undefined, {
    hasEmail: !!email,
    hasIv: !!iv,
    oldPasswordLength: oldPassword?.length,
    newPasswordLength: newPassword?.length,
    requestIP: req.ip
  });

  if (!email || !iv || !oldPassword || !newPassword) {
    authLogger.warn('Missing required fields for email password change', undefined, {
      hasEmail: !!email,
      hasIv: !!iv,
      hasOldPassword: !!oldPassword,
      hasNewPassword: !!newPassword
    });
    return reply.status(400).send(
      errorResponse(400, {
        success: false,
        message: ERROR_MESSAGES.EMAIL_PASSWORD_REQUIRED,
      })
    );
  }

  try {
    authLogger.info('Decrypting email for password change');
    const decryptedEmail = decryptEmail(email, iv);

    authLogger.info('Email decrypted successfully, proceeding with password change', decryptedEmail);

    await changeUserPasswordSeriveInCognito(decryptedEmail, oldPassword, newPassword);

    authLogger.info('Change email password completed successfully', decryptedEmail);

    return reply.status(200).send(successResponse(200, SUCCESS_MESSAGES.CHANGE_PASSWORD_SUCCESS));
  } catch (error) {
    authLogger.error('Change email password failed', error, undefined, {
      requestIP: req.ip
    });
    return reply.status(500).send(
      errorResponse(
        500,
        ERROR_MESSAGES.PASSWORD_CHANGE_FAILED || {
          success: false,
          message: 'Failed to change password.',
        },
        error instanceof Error ? error.message : 'Unknown error'
      )
    );
  }
};