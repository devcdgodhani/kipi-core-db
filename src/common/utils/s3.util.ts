import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  CopyObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl as getAwsSignedUrl } from '@aws-sdk/s3-request-presigner';

let s3Client: S3Client;

function getS3Client(): S3Client {
  if (!s3Client) {
    s3Client = new S3Client({
      region: process.env.AWS_REGION || 'ap-south-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });
  }
  return s3Client;
}

/**
 * Creates a folder in S3 (0-byte object with trailing slash).
 */
export async function createFolder(
  folderPath: string,
  bucket: string = process.env.AWS_S3_BUCKET!,
): Promise<void> {
  const key = folderPath.endsWith('/') ? folderPath : `${folderPath}/`;
  const command = new PutObjectCommand({ Bucket: bucket, Key: key, Body: '' });
  await getS3Client().send(command);
}

/**
 * Copies a file within S3.
 */
export async function copyFile(
  sourceKey: string,
  destKey: string,
  bucket: string = process.env.AWS_S3_BUCKET!,
): Promise<void> {
  const cleanSource = sourceKey.startsWith('/') ? sourceKey.substring(1) : sourceKey;
  const encodedSource = encodeURIComponent(cleanSource).replace(/%2F/g, '/');
  const command = new CopyObjectCommand({
    Bucket: bucket,
    CopySource: `${bucket}/${encodedSource}`,
    Key: destKey.startsWith('/') ? destKey.substring(1) : destKey,
  });
  await getS3Client().send(command);
}

/**
 * Upload a file buffer to S3.
 */
export async function uploadFileToS3(
  key: string,
  bucket: string,
  buffer: Buffer,
  mimeType: string,
): Promise<void> {
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: buffer,
    ContentType: mimeType,
  });
  await getS3Client().send(command);
}

/**
 * Delete a single object from S3.
 */
export async function deleteFileFromS3(key: string, bucket: string = process.env.AWS_S3_BUCKET!): Promise<void> {
  const command = new DeleteObjectCommand({ Bucket: bucket, Key: key });
  await getS3Client().send(command);
}

/**
 * Delete a folder marker from S3.
 */
export async function deleteFolderFromS3(folderPath: string, bucket: string = process.env.AWS_S3_BUCKET!): Promise<void> {
  const key = folderPath.endsWith('/') ? folderPath : `${folderPath}/`;
  await deleteFileFromS3(key, bucket);
}

/**
 * Generate a pre-signed GET URL for an S3 object.
 */
export async function getSignedUrlHelper(
  key: string,
  bucket: string = process.env.AWS_S3_BUCKET!,
  expiresIn = 60 * 60 * 24,
): Promise<string> {
  const command = new GetObjectCommand({ Bucket: bucket, Key: key });
  return getAwsSignedUrl(getS3Client(), command, { expiresIn });
}
