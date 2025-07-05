// utils/crypto.ts
import crypto from 'crypto';

const algorithm = 'aes-256-cbc';
const secretKey = 'MySuperSecretKey1234567890123456';
const iv = crypto.randomBytes(16);

export const encryptEmail = (email: string): { encryptedData: string; iv: string } => {
  const cipher = crypto.createCipheriv(algorithm, Buffer.from(secretKey), iv);
  let encrypted = cipher.update(email);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return {
    encryptedData: encrypted.toString('hex'),
    iv: iv.toString('hex'),
  };
};

export const decryptEmail = (encryptedData: string, ivHex: string): string => {
  const decipher = crypto.createDecipheriv(
    algorithm,
    Buffer.from(secretKey),
    Buffer.from(ivHex, 'hex'),
  );
  let decrypted = decipher.update(Buffer.from(encryptedData, 'hex'));
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
};
