import { Injectable } from '@nestjs/common';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
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

    this.s3Client = new S3Client({
      region: envService.awsRegion,
      credentials:
        envService.awsAccessKeyId && envService.awsSecretAccessKey
          ? {
              accessKeyId: envService.awsAccessKeyId,
              secretAccessKey: envService.awsSecretAccessKey,
            }
          : undefined,
    });
  }

  async generatePresignedUploadUrl(params: {
    companyId: string;
    projectId: string;
    mimeType: string;
  }): Promise<PresignedUploadResult> {
    const fileId = randomUUID();
    const objectKey = `companies/${params.companyId}/projects/${params.projectId}/files/${fileId}`;

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: objectKey,
      ContentType: params.mimeType,
    });

    const uploadUrl = await getSignedUrl(this.s3Client, command, {
      expiresIn: 300,
    });

    return {
      uploadUrl,
      objectKey,
    };
  }

  validateObjectKeyPrefix(params: {
    objectKey: string;
    companyId: string;
    projectId: string;
  }): boolean {
    const expectedPrefix = `companies/${params.companyId}/projects/${params.projectId}/files/`;
    return params.objectKey.startsWith(expectedPrefix);
  }
}
