import { FastifyRequest, FastifyReply } from 'fastify';
import { ERROR_MESSAGES } from '../responses/constants/authConstant';
import { CheckEmailRequestBody, ResetPasswordRequestBody, SendOtpRequestBody, SignRequestBody, VerifyOtpRequestBody } from '@src/interfaces/authInterfaces';
import { authLogger } from '@src/utils/logger';
import { checkEmailExists } from '@src/repositroies/authModel';
import { validate } from 'node-cron';
import { BadRequestError, NotFoundError } from '@src/errors/httpErrors';

// ログインAPIバリデーション
export const validateSignIn = async (
  request: FastifyRequest<{
    Body: SignRequestBody;
  }>,
  reply: FastifyReply,
): Promise<void> => {
  const { email } = request.body;

  authLogger.info('Sign-in request received', email, {
    requestIP: request.ip,
    userAgent: request.headers['user-agent'],
  });

  // メールアドレスの必須チェック
  if (!email || email.trim() === '') {
    return reply.status(400).send({
      statusCode: 400,
      message: ERROR_MESSAGES.REQUIRE_EMAIL,
    });
  }

  // メールアドレスの形式チェック
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return reply.status(400).send({
      statusCode: 400,
      message: 'Invalid email format',
    });
  }

  try {
    authLogger.info('Checking email exists in database', email);

    // メールアドレスの存在チェック
    if (!(await checkEmailExists(email))) {
      authLogger.warn('Email not found in database', email);
      throw {
        statusCode: 404,
        message: ERROR_MESSAGES.EMAIL_NOT_FOUND,
      };
    }
  } catch (error: any) {
    authLogger.error('Sign-in controller failed', error, email, {
      statusCode: error.statusCode,
      requestIP: request.ip,
    });
    throw error;
  }
};

// SendOtP APIバリデーション
export const validateSendOtp = async (
  request: FastifyRequest<{
    Body: SendOtpRequestBody;
  }>,
  reply: FastifyReply,
  ): Promise<void> => {
  const { email } = request.body;

  authLogger.info('Sign-in request received', email, {
    requestIP: request.ip,
    userAgent: request.headers['user-agent'],
  });

  // メールアドレスの必須チェック
  if (!email || email.trim() === '') {
    return reply.status(400).send({
      statusCode: 400,
      message: ERROR_MESSAGES.REQUIRE_EMAIL,
    });
  }

  // メールアドレスの形式チェック
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return reply.status(400).send({
      statusCode: 400,
      message: 'Invalid email format',
    });
  }

  try {
    authLogger.info('Checking email exists in database', email);

    authLogger.info('Send OTP request received', email, {
      requestIP: request.ip
    });

    // メールアドレスの存在チェック
    if (!(await checkEmailExists(email))) {
      authLogger.warn('Email not found in database', email);
      throw {
        statusCode: 404,
        message: ERROR_MESSAGES.EMAIL_NOT_FOUND,
      };
    }
  } catch (error: any) {
    authLogger.error('Send OTP controller failed', error, email, {
      statusCode: error.statusCode,
      requestIP: request.ip,
    });
    throw error;
  }
};

// VerifyOtpA API
export const validateVerifyOtp = async(
  request: FastifyRequest<{
    Body: VerifyOtpRequestBody;
  }>,
  reply: FastifyReply,
  ): Promise<void> => {
  const { email, otp } = request.body;

  authLogger.info('Verify OTP request received', email, {
    otpLength: otp.length,
    requestIP: request.ip
  });

  try {
    if (!(await checkEmailExists(email))) {
      authLogger.warn('Email not found for OTP verification', email);
      throw {
        statusCode: 404,
        message: ERROR_MESSAGES.EMAIL_NOT_EXISTS
      };
    }

  } catch (error: any) {
    authLogger.error('Verify OTP controller failed', error, email, {
      otpLength: otp.length,
      requestIP: request.ip
    });
    throw error;
  }
};

// auth/reset-password APIのバリデーション
export const validateResetPassword = async(
  request: FastifyRequest<{
    Body: ResetPasswordRequestBody;
    }>,
  reply: FastifyReply,
  ): Promise<void> => {

  const { email, verificationCode, newPassword } = request.body;

  authLogger.info('Reset password request received', email, {
    verificationCodeLength: verificationCode?.length,
    newPasswordLength: newPassword?.length,
    requestIP: request.ip
  });

  if (!email || !verificationCode || !newPassword) {
    authLogger.warn('Missing required fields for password reset', email, {
      hasEmail: !!email,
      hasVerificationCode: !!verificationCode,
      hasNewPassword: !!newPassword
    });
    throw new BadRequestError(ERROR_MESSAGES.EMAIL_VALIDATION_CODE_NEW_PASSWORD_REQUIRED);
  }

  try {
    const emailExists = await checkEmailExists(email);
    if (!emailExists) {
      authLogger.warn('Email not found for password reset', email);
      throw new NotFoundError(ERROR_MESSAGES.EMAIL_NOT_EXISTS);
    }
  } catch (cognitoError: any) {
    authLogger.error('Reset password controller failed', cognitoError, email, {
      requestIP: request.ip
    });
    throw new BadRequestError(
      cognitoError.message || ERROR_MESSAGES.NOT_MET_VERIFICATION_CODE_REQUIREMENTS
    );
  }
}

// /auth/check-email APIのバリデーション
export const validatecheckEmail = async(
  request: FastifyRequest<{
    Body: CheckEmailRequestBody;
  }>,
  reply: FastifyReply
  ): Promise<void> => {

  const { email } = request.body;

  authLogger.info('Check email request received', email, {
    requestIP: request.ip
  });

  if (!email) {
    authLogger.warn('Email check request missing email field', undefined, {
      requestIP: request.ip
    });
    throw {
      statusCode: 400,
      message: ERROR_MESSAGES.REQUIRE_EMAIL
    };
  }

  try {
    const emailExists = await checkEmailExists(email);

    if (!emailExists) {
      authLogger.warn('Email not registered in system', email);
      throw {
        statusCode: 404,
        message: ERROR_MESSAGES.NOT_REGISTER_EMAIL
      };
    }

  } catch (error: any) {
    authLogger.error('Check email controller failed', error, email, {
      requestIP: request.ip
    });
    throw error;
  }
}