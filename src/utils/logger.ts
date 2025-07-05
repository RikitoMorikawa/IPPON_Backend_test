import { createLogger, format, transports } from 'winston';

const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: format.combine(
    format.errors({ stack: true }),
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.printf(({ timestamp, level, message, stack, ...meta }) => {
      let metaStr = '';
      if (Object.keys(meta).length > 0) {
        metaStr = ` | ${JSON.stringify(meta, null, 2)}`;
      }
      return `${timestamp} [${level.toUpperCase()}]: ${message}${stack ? `\nStack: ${stack}` : ''}${metaStr}`;
    }),
  ),
  transports: [
    new transports.Console({
      format: format.combine(
        format.colorize(),
        format.printf(({ timestamp, level, message, stack, ...meta }) => {
          let metaStr = '';
          if (Object.keys(meta).length > 0) {
            metaStr = ` | ${JSON.stringify(meta, null, 2)}`;
          }
          return `${timestamp} [${level.toUpperCase()}]: ${message}${stack ? `\nStack: ${stack}` : ''}${metaStr}`;
        })
      )
    }),
    new transports.File({ 
      filename: 'logs/error.log', 
      level: 'error',
      format: format.uncolorize()
    }),
    new transports.File({ 
      filename: 'logs/combined.log',
      format: format.uncolorize()
    })
  ],
});

// 認証関連の専用ログ関数
export const authLogger = {
  info: (message: string, email?: string, additionalData?: any) => {
    logger.info(message, {
      module: 'AUTH',
      email: email ? `${email.substring(0, 3)}***@${email.split('@')[1]}` : undefined,
      ...additionalData
    });
  },
  
  warn: (message: string, email?: string, additionalData?: any) => {
    logger.warn(message, {
      module: 'AUTH',
      email: email ? `${email.substring(0, 3)}***@${email.split('@')[1]}` : undefined,
      ...additionalData
    });
  },
  
  error: (message: string, error?: any, email?: string, additionalData?: any) => {
    logger.error(message, {
      module: 'AUTH',
      email: email ? `${email.substring(0, 3)}***@${email.split('@')[1]}` : undefined,
      errorCode: error?.code || error?.name,
      errorMessage: error?.message,
      awsErrorCode: error?.__type,
      statusCode: error?.statusCode,
      stack: error?.stack,
      ...additionalData
    });
  },
  
  cognitoOperation: (operation: string, email: string, status: 'START' | 'SUCCESS' | 'ERROR', details?: any) => {
    const level = status === 'ERROR' ? 'error' : 'info';
    logger[level](`Cognito ${operation} - ${status}`, {
      module: 'COGNITO',
      operation,
      email: `${email.substring(0, 3)}***@${email.split('@')[1]}`,
      status,
      ...details
    });
  }
};

export default logger;
