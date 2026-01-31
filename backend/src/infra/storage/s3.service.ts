import { Injectable } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  CopyObjectCommand,
} from '@aws-sdk/client-s3';
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

  async getPresignedDownloadUrl(
    objectKey: string,
    options?: { expiresInSeconds?: number; responseContentDisposition?: string },
  ): Promise<string> {
    const expiresIn = options?.expiresInSeconds ?? 3600;
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: objectKey,
      ...(options?.responseContentDisposition && {
        ResponseContentDisposition: options.responseContentDisposition,
      }),
    });
    return getSignedUrl(this.s3Client, command, { expiresIn });
  }

  /**
   * Copy object to itself with new Content-Disposition (and optional ContentType) so the object store reflects the display filename.
   */
  async setObjectContentDisposition(
    objectKey: string,
    contentDisposition: string,
    contentType?: string,
  ): Promise<void> {
    const copySource = encodeURI(`${this.bucket}/${objectKey}`);
    await this.s3Client.send(
      new CopyObjectCommand({
        Bucket: this.bucket,
        CopySource: copySource,
        Key: objectKey,
        ContentDisposition: contentDisposition,
        ...(contentType && { ContentType: contentType }),
        MetadataDirective: 'REPLACE',
      }),
    );
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
