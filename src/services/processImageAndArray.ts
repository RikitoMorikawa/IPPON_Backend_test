import { uploadFileToS3, S3BucketType } from '@src/services/s3Service';

export const parseArrayData = (value: string | string[]): string[] => {
  if (Array.isArray(value)) {
    return value;
  }

  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    if (typeof parsed === 'string') {
      return [parsed];
    }
  } catch (e) {
    return [value];
  }

  throw new Error('Invalid data format. Expected an array or string.');
};

export const processBase64Image = async (
  imageData: string,
  folderName: string,
  clientId: string,
  bucketType: S3BucketType = 'property',
): Promise<string> => {
  try {
    if (imageData.startsWith('http')) {
      return imageData;
    }

    const base64String = imageData.includes('base64,') ? imageData.split('base64,')[1] : imageData;

    let mimeTypeFromData = '';
    if (imageData.includes('data:') && imageData.includes(';base64,')) {
      mimeTypeFromData = imageData.split(';')[0].split(':')[1];
    }

    const buffer = Buffer.from(base64String, 'base64');

    if (buffer.length === 0) {
      throw new Error('Empty file received');
    }

    const contentType = mimeTypeFromData || detectMimeType(buffer);

    let extension = 'jpeg';

    if (contentType.includes('png')) {
      extension = 'png';
    } else if (contentType.includes('webp')) {
      extension = 'webp';
    } else if (contentType.includes('pdf')) {
      extension = 'pdf';
    }

    const uniqueFilename = `${Date.now()}-${Math.random().toString(36).substring(7)}.${extension}`;
    const s3Key = `${folderName}/${clientId}/${uniqueFilename}`;

    const s3Url = await uploadFileToS3(buffer, s3Key, contentType, bucketType);

    return s3Url;
  } catch (error) {
    console.error('Error processing image data:', error);
    throw new Error(`Failed to process image: ${(error as Error).message}`);
  }
};

export const detectMimeType = (buffer: Buffer): string => {
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    return 'image/png';
  }

  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }

  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return 'image/webp';
  }

  if (buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) {
    return 'application/pdf';
  }

  return 'image/jpeg';
};
