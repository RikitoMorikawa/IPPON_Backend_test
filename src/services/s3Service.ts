import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import config from '@src/config';


if (!config.aws.accessKeyId || !config.aws.secretAccessKey || !config.aws.s3.bucket) {
  throw new Error('AWS credentials or bucket name are not properly configured');
}

const s3Client = new S3Client({
  region: 'ap-northeast-1',
  credentials: {
    accessKeyId: config.aws.accessKeyId,
    secretAccessKey: config.aws.secretAccessKey,
  },
  forcePathStyle: true,
});
export const uploadFileToS3 = async (
  fileBuffer: Buffer,
  key: string,
  contentType: string,
): Promise<string> => {
  try {
    console.log('Starting upload:', {
      bucket: config.aws.s3.bucket,
      key: key,
      contentType: contentType,
      bufferSize: fileBuffer.length,
    });

    const params = {
      Bucket: config.aws.s3.bucket,
      Key: key,
      Body: fileBuffer,
      ContentType: contentType,
     // ACL: 'public-read' as ObjectCannedACL,
    };

    const command = new PutObjectCommand(params);
    await s3Client.send(command);

    const encodedKey = key
      .split('/')
      .map((part) => encodeURIComponent(part))
      .join('/');
    const s3Url = `https://${config.aws.s3.bucket}.s3.ap-northeast-1.amazonaws.com/${encodedKey}`;

    return s3Url;
  } catch (error) {
    console.error('S3 Upload Error:', {
      bucket: config.aws.s3.bucket,
      key: key,
      errorMessage: (error as Error).message,
      errorStack: (error as Error).stack,
    });
    throw new Error(`S3 upload failed: ${(error as Error).message}`);
  }
};

// Helper function to get file from S3 and return as base64
export const getFileFromS3 = async (key: string): Promise<string> => {
  try {
    const command = new GetObjectCommand({
      Bucket: config.aws.s3.bucket,
      Key: key,
    });

    const response = await s3Client.send(command);
    const chunks: Buffer[] = [];

    // @ts-ignore - 'Body' is actually a Readable stream
    for await (const chunk of response.Body) {
      chunks.push(Buffer.from(chunk));
    }

    const buffer = Buffer.concat(chunks);
    const base64Data = buffer.toString('base64');

    // Get content type from S3 object
    const contentType = response.ContentType || 'application/octet-stream';

    // Return as data URL
    return `data:${contentType};base64,${base64Data}`;
  } catch (error) {
    console.error('S3 Download Error:', {
      bucket: config.aws.s3.bucket,
      key: key,
      errorMessage: (error as Error).message,
      errorStack: (error as Error).stack,
    });
    throw new Error(`S3 download failed: ${(error as Error).message}`);
  }
};
// Helper function to validate file size and type
export const validateFile = (
  buffer: Buffer,
  contentType: string,
  maxSize: number = 10 * 1024 * 1024, // 10MB default
): void => {
  if (buffer.length > maxSize) {
    throw new Error(`File size exceeds maximum limit of ${maxSize / (1024 * 1024)}MB`);
  }

  // Add content type validation if needed
  const allowedTypes = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/jpg',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];

  if (!allowedTypes.includes(contentType)) {
    throw new Error('Invalid file type');
  }
};

// ✅ Delete File from S3 with Key Validation
export const deleteFileFromS3 = async (s3Key: string) => {
  if (!s3Key) {
    throw new Error('S3 key is required for file deletion.');
  }

  // Ensure correct formatting of the S3 key
  const correctedKey = s3Key.replace(/^s3:\/\/[^/]+\//, '');

  const params = {
    Bucket: config.aws.s3.bucket,
    Key: correctedKey,
  };

  try {
    console.log(`Attempting to delete file: ${correctedKey}`);
    await s3Client.send(new DeleteObjectCommand(params));
    console.log('File successfully deleted from S3.');
    return true;
  } catch (error) {
    console.error('Error deleting file from S3:', error);
    throw new Error(
      'S3 delete operation failed. Ensure the file exists and your credentials are correct.',
    );
  }
};
