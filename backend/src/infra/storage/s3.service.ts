import { Injectable } from '@nestjs/common';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { EnvService } from '../../config/env.service';
import { randomUUID } from 'crypto';

export interface PresignedUploadResult {
  uploadUrl: string;
  objectKey: string;
}

@Injectable()
export class S3Service {
  private readonly s3Client: S3Client;
  private readonly bucket: string;

  constructor(private readonly envService: EnvService) {
    this.bucket = envService.s3Bucket;

    const endpoint = envService.s3Endpoint; // e.g. http://localhost:4566 (or http://localstack:4566 inside docker)

    this.s3Client = new S3Client({
      region: envService.awsRegion,
      endpoint: envService.s3Endpoint || undefined,
      forcePathStyle: envService.s3ForcePathStyle ?? false, // important for localstack reliability
      credentials: {
        // LocalStack accepts any static keys, but they must be present for signing
        accessKeyId: envService.awsAccessKeyId || 'test',
        secretAccessKey: envService.awsSecretAccessKey || 'test',
      },
    });
  }

  async generatePresignedUploadUrl(params: {
    companyId: string;
    projectId?: string | null;
    mimeType: string;
  }): Promise<PresignedUploadResult> {
    const fileId = randomUUID();
    const objectKey =
      params.projectId != null
        ? `companies/${params.companyId}/projects/${params.projectId}/files/${fileId}`
        : `companies/${params.companyId}/files/${fileId}`;

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: objectKey,
      ContentType: params.mimeType,
    });

    const uploadUrl = await getSignedUrl(this.s3Client, command, { expiresIn: 300 });

    return { uploadUrl, objectKey };
  }

  async getPresignedDownloadUrl(objectKey: string, expiresInSeconds = 3600): Promise<string> {
    const command = new GetObjectCommand({ Bucket: this.bucket, Key: objectKey });
    return getSignedUrl(this.s3Client, command, { expiresIn: expiresInSeconds });
  }

  validateObjectKeyPrefix(params: {
    objectKey: string;
    companyId: string;
    projectId?: string | null;
  }): boolean {
    if (params.projectId != null) {
      const expectedPrefix = `companies/${params.companyId}/projects/${params.projectId}/files/`;
      return params.objectKey.startsWith(expectedPrefix);
    }
    const expectedPrefix = `companies/${params.companyId}/files/`;
    return params.objectKey.startsWith(expectedPrefix);
  }
}
