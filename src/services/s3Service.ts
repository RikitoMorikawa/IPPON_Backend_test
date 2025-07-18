import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  ObjectCannedACL,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import config from '@src/config';

// S3バケットタイプの定義
export type S3BucketType = 'property' | 'client' | 'company' | 'document' | 'contractor' | 'delete';

// バケット名を取得するヘルパー関数
const getBucketName = (bucketType: S3BucketType): string => {
  return config.aws.s3.buckets[bucketType];
};

if (!config.aws.accessKeyId || !config.aws.secretAccessKey) {
  throw new Error('AWS credentials are not properly configured');
}

const s3Client = new S3Client({
  region: config.aws.region || 'ap-northeast-1',
  credentials: {
    accessKeyId: config.aws.accessKeyId,
    secretAccessKey: config.aws.secretAccessKey,
  },
  // forcePathStyle: true, // AWS S3では不要（ローカル開発のMinIO等で使用）
});
export const uploadFileToS3 = async (
  fileBuffer: Buffer,
  key: string,
  contentType: string,
  bucketType: S3BucketType = 'document', // デフォルトはdocument
): Promise<string> => {
  try {
    const bucketName = getBucketName(bucketType);

    const params = {
      Bucket: bucketName,
      Key: key,
      Body: fileBuffer,
      ContentType: contentType,
      // ACL: ObjectCannedACL.public_read, // バケットでACLが無効のため一時的にコメントアウト
    };

    const command = new PutObjectCommand(params);
    await s3Client.send(command);

    const encodedKey = key
      .split('/')
      .map((part) => encodeURIComponent(part))
      .join('/');
    const s3Url = `https://${bucketName}.s3.ap-northeast-1.amazonaws.com/${encodedKey}`;

    return s3Url;
  } catch (error) {
    // console.log削除済み
    throw new Error(`S3 upload failed: ${(error as Error).message}`);
  }
};

// Helper function to get file from S3 and return as base64
export const getFileFromS3 = async (key: string, bucketType: S3BucketType = 'document'): Promise<string> => {
  try {
    const bucketName = getBucketName(bucketType);
    
    const command = new GetObjectCommand({
      Bucket: bucketName,
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
    // console.log削除済み
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
export const deleteFileFromS3 = async (s3Key: string, bucketType: S3BucketType = 'document') => {
  if (!s3Key) {
    throw new Error('S3 key is required for file deletion.');
  }

  // Ensure correct formatting of the S3 key
  const correctedKey = s3Key.replace(/^s3:\/\/[^/]+\//, '');
  const bucketName = getBucketName(bucketType);

  const params = {
    Bucket: bucketName,
    Key: correctedKey,
  };

  try {
    // console.log削除済み
    await s3Client.send(new DeleteObjectCommand(params));
    // console.log削除済み
    return true;
  } catch (error) {
    // console.log削除済み
    throw new Error(
      'S3 delete operation failed. Ensure the file exists and your credentials are correct.',
    );
  }
};

// 署名付きURL生成関数
export const generateSignedUrl = async (
  s3Key: string,
  bucketType: S3BucketType = 'document',
  expiresIn: number = 3600, // デフォルト1時間（3600秒）
): Promise<string> => {
  try {
    const bucketName = getBucketName(bucketType);
    
    // S3キーからURL部分を除いてキーのみ抽出
    const cleanKey = s3Key.replace(/^https?:\/\/[^/]+\//, '');
    
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: cleanKey,
    });

    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn });
    
    console.log('Generated signed URL:', {
      bucket: bucketName,
      key: cleanKey,
      expiresIn: `${expiresIn}秒`,
    });

    return signedUrl;
  } catch (error) {
    console.error('Error generating signed URL:', {
      bucket: getBucketName(bucketType),
      key: s3Key,
      errorMessage: (error as Error).message,
    });
    throw new Error(`Failed to generate signed URL: ${(error as Error).message}`);
  }
};

// 複数の画像に対して署名付きURLを生成
export const generateSignedUrlsForImages = async (
  imageUrls: string[],
  bucketType: S3BucketType = 'property',
  expiresIn: number = 3600,
): Promise<string[]> => {
  if (!imageUrls || !Array.isArray(imageUrls)) {
    return [];
  }

  const signedUrls = await Promise.all(
    imageUrls.map(async (imageUrl) => {
      try {
        return await generateSignedUrl(imageUrl, bucketType, expiresIn);
      } catch (error) {
        console.error(`Failed to generate signed URL for ${imageUrl}:`, error);
        return imageUrl; // エラーの場合は元のURLを返す
      }
    })
  );

  return signedUrls;
};
