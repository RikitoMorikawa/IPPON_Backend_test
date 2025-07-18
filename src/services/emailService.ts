import fs from 'fs';
import path from 'path';
import { SUCCESS_MESSAGES } from '@src/responses/constants/emailConstant';
import AWS from 'aws-sdk';
import config from '../config';

export const ses = new AWS.SES({
  region: config.aws.region,
  accessKeyId: config.aws.accessKeyId,
  secretAccessKey: config.aws.secretAccessKey,
});

export const sendTemporaryPasswordEmail = async (email: string, tempPassword: string) => {
  try {
    const htmlContent = renderTemplateForEmployee(tempPassword);
    await sendEmailWithSES(email, htmlContent, 'IPPON 売買仲介へようこそ');
    console.log(`Temporary password sent to ${email} using SES`);
  } catch (error) {
    console.error('Error sending email:', error);
    throw new Error('Failed to send temporary password email');
  }
};



const renderTemplate = (customer_id: string, customerType: string, client_id: string): string => {
  const templatePath = path.join(__dirname, '..', 'templates', 'welcome-template.html');
  console.log('Template path:', templatePath);
  let template = fs.readFileSync(templatePath, 'utf-8');

  console.log('Template path:', customerType);

  template = template.replace('{{IPPON_CLIENT_EMPLOYEE_AWS_CLIENT_ID}}', client_id);
  template = template.replace('{{CUSTOMER_ID}}', customer_id);
  template = template.replace('{{CUSTOMER_TYPE}}', customerType);
  return template;
};

export const sendEmailWithSES = async (
  to: string,
  htmlContent: string,
  subject: string = SUCCESS_MESSAGES.WELCOME_MESSAGE,
) => {
  const sourceEmail = config.email.sourceEmail;

  const params = {
    Source: sourceEmail,
    Destination: {
      ToAddresses: [to],
    },
    Message: {
      Subject: {
        Data: subject,
        Charset: 'UTF-8',
      },
      Body: {
        Html: {
          Data: htmlContent,
          Charset: 'UTF-8',
        },
      },
    },
  };

  try {
    const response = await ses.sendEmail(params).promise();
    console.log('Email sent successfully:', response);
    return true;
  } catch (error) {
    console.error('Error sending email with SES:', error);
    throw error;
  }
};

const renderTemplateforMember = (email: string, iv: string): string => {
  const templatePath = path.join(__dirname, '..', 'templates', 'change-password-template.html');
  let template = fs.readFileSync(templatePath, 'utf-8');
  template = template.replace('{{EMAIL}}', email);
  template = template.replace('{{IV}}', iv);
  template = template.replace('{{BASE_URL}}', config.frontend.baseUrl);

  return template;
};

const renderTemplateForEmployee = (tempPassword: string): string => {
  const templatePath = path.join(__dirname, '..', 'templates', 'employee-invitation-template.html');
  let template = fs.readFileSync(templatePath, 'utf-8');
  template = template.replace('{{TEMP_PASSWORD}}', tempPassword);
  template = template.replace('{{LOGIN_URL}}', config.frontend.baseUrl);

  return template;
};

export const constructEmailContent = (
  customerId: string,
  customerType: string,
  clientId: string,
) => {
  return renderTemplate(customerId, customerType, clientId);
};

export const constructEmailContentforMember = (email: string, iv: string) => {
  return renderTemplateforMember(email, iv);
};
