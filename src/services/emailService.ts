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
    await sendPassword(email, tempPassword);
    console.log(`Temporary password sent to ${email} using SES`);
  } catch (error) {
    console.error('Error sending email:', error);
    throw new Error('Failed to send temporary password email');
  }
};

export const sendPassword = async (email: string, tempPassword: string): Promise<boolean> => {
  const sourceEmail = config.email.sourceEmail;

  const params = {
    Source: sourceEmail,
    Destination: {
      ToAddresses: [email],
    },
    Message: {
      Subject: {
        Data: 'Your Temporary Password',
        Charset: 'UTF-8',
      },
      Body: {
        Text: {
          Data: `Hello,\n\nYour temporary password is: ${tempPassword}\n\nPlease change your password upon login.\n\nThank you!`,
          Charset: 'UTF-8',
        },
        Html: {
          Data: `<html>

<head>
    <style>
        body {
            font-last: Arial, sans-serif;
            line-height: 1.6;
        }

        .container {
            padding: 20px;
            max-width: 600px;
            margin: 0 auto;
        }

        .logo {
            max-width: 180px;
        }

        .heading {
            color: #0B9DBD;
            font-size: 25px;
        }

        .password {
            font-weight: bold;
            font-size: 18px;
            padding: 10px;
            background-color: #f5f5f5;
            text-align: center;
        }

        .button {
            display: inline-block;
            padding: 10px 20px;
            background-color: #0B9DBD;
            color: #fff !important;
            text-decoration: none;
            border-radius: 5px;
        }

        .center {
            text-align: center;
        }

        .text-note {
            font-size: 16px;
            color: #000000;
        }

        .text-note.top-padding {
            padding-top: 10px;
        }

        .footer {
            margin-top: 30px;
            color: #989898;
            font-size: 18px;
        }
    </style>
</head>

<body>
    <div class="container">
        <img src="https://ippon-cloud.com/static/media/ippon_logo_02.ec2472a33e543ff3e46b.png" class="logo"
            alt="IPPON Logo" />
        <h2 class="heading">IPPON 売買へようこそ</h2>
        <p>こんにちは、</p>
        <p>アカウントが作成されました。仮パスワードはこちらです：</p>
        <p class="password">${tempPassword}</p>
        <div class="center">
            <a href="https://sales-brokerage.ippon-cloud.com/" class="button">ログイン画面へ移行する</a>
        </div>
        <p class="text-note top-padding">初回ログイン時にパスワードを変更してください。</p>
        <p class="text-note">ありがとうございました！</p>
        <div class="footer">
            <p>これは自動メッセージです。このメールに返信しないでください。</p>
            <p>IPPON カスタマーセンター</p>
        </div>
    </div>
</body>

</html>`,
          Charset: 'UTF-8',
        },
      },
    },
  };

  try {
    const response = await ses.sendEmail(params).promise();
    console.log(`Temporary password sent to ${email}`);
    return true;
  } catch (error) {
    console.error('Error sending password email with SES:', error);
    throw error;
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
