import { FastifyReply, FastifyRequest } from 'fastify';
import { constructEmailContent, sendEmailWithSES } from '@src/services/emailService';
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from '@src/responses/constants/emailConstant';
import { CustomFastifyInstance } from '@src/interfaces/CustomFastifyInstance';

export const sendEmail = async (
  app: CustomFastifyInstance,
  req?: FastifyRequest,
  reply?: FastifyReply,
  email?: string,
  customer_id?: string,
  customerType?: string,
  client_id?: string,
): Promise<{ success: boolean; message: string }> => {
  try {
    const {
      email: reqEmail,
      customer_id: reqCustomerId,
      customerType: reqCustomerType,
      client_id: reqClientId,
    } = (req?.body as any) || {};

    const finalEmail = reqEmail ?? email;
    const finalCustomerId = reqCustomerId ?? customer_id;
    const finalCustomerType = reqCustomerType
      ? reqCustomerType === '1'
        ? 'individual'
        : reqCustomerType === '2'
          ? 'corporate'
          : ''
      : (customerType ?? '');
    const finalClientId = reqClientId ?? client_id ?? '';

    if (!finalEmail || !finalCustomerId) {
      return {
        success: false,
        message: ERROR_MESSAGES.REQUIRE_PARAMETERS,
      };
    }

    const htmlContent = constructEmailContent(finalCustomerId, finalCustomerType, finalClientId);
    await sendEmailWithSES(finalEmail, htmlContent);

    return {
      success: true,
      message: SUCCESS_MESSAGES.EMAIL_SENT,
    };
  } catch (error: unknown) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to send email',
    };
  }
};
