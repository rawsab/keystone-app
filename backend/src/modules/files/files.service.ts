import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../infra/db/prisma.service';
import { AuditService } from '../audit/audit.service';
import { MembershipService } from '../../security/rbac/membership.service';
import { S3Service } from '../../infra/storage/s3.service';
import { EnvService } from '../../config/env.service';
import { PolicyUser } from '../../security/rbac';
import { PresignRequestDto } from './dto/presign-request.dto';
import { PresignResponseDto, PresignBatchResponseDto } from './dto/presign-response.dto';
import { FinalizeRequestDto } from './dto/finalize-request.dto';
import { FileResponseDto } from './dto/file-response.dto';

@Injectable()
export class FilesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly membershipService: MembershipService,
    private readonly s3Service: S3Service,
    private readonly envService: EnvService,
  ) {}

  async presignUpload(
    user: PolicyUser,
    dto: PresignRequestDto,
  ): Promise<PresignResponseDto | PresignBatchResponseDto> {
    const projectExists = await this.membershipService.verifyProjectExists({
      projectId: dto.project_id,
      companyId: user.companyId,
    });

    if (!projectExists) {
      throw new NotFoundException('Project not found');
    }

    const isMember = await this.membershipService.isProjectMember({
      userId: user.userId,
      companyId: user.companyId,
      projectId: dto.project_id,
    });

    if (!isMember) {
      throw new ForbiddenException('Not a project member');
    }

    if (dto.files && dto.files.length > 0) {
      const items = await Promise.all(
        dto.files.map(async (file) => {
          const result = await this.s3Service.generatePresignedUploadUrl({
            companyId: user.companyId,
            projectId: dto.project_id,
            mimeType: file.mime_type,
          });

          return {
            upload_url: result.uploadUrl,
            object_key: result.objectKey,
            original_filename: file.original_filename,
          };
        }),
      );

      return { items };
    }

    if (!dto.original_filename || !dto.mime_type || !dto.size_bytes) {
      throw new BadRequestException(
        'Single file request requires original_filename, mime_type, and size_bytes',
      );
    }

    const result = await this.s3Service.generatePresignedUploadUrl({
      companyId: user.companyId,
      projectId: dto.project_id,
      mimeType: dto.mime_type,
    });

    return {
      upload_url: result.uploadUrl,
      object_key: result.objectKey,
    };
  }

  async finalizeUpload(user: PolicyUser, dto: FinalizeRequestDto): Promise<FileResponseDto> {
    const projectExists = await this.membershipService.verifyProjectExists({
      projectId: dto.project_id,
      companyId: user.companyId,
    });

    if (!projectExists) {
      throw new NotFoundException('Project not found');
    }

    const isMember = await this.membershipService.isProjectMember({
      userId: user.userId,
      companyId: user.companyId,
      projectId: dto.project_id,
    });

    if (!isMember) {
      throw new ForbiddenException('Not a project member');
    }

    const isValidPrefix = this.s3Service.validateObjectKeyPrefix({
      objectKey: dto.object_key,
      companyId: user.companyId,
      projectId: dto.project_id,
    });

    if (!isValidPrefix) {
      throw new BadRequestException('Invalid object_key prefix');
    }

    const existingFile = await this.prisma.fileObject.findFirst({
      where: {
        bucket: this.envService.s3Bucket,
        objectKey: dto.object_key,
        companyId: user.companyId,
      },
      include: {
        uploadedBy: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
    });

    if (existingFile) {
      return {
        id: existingFile.id,
        original_filename: existingFile.originalFilename,
        mime_type: existingFile.mimeType,
        size_bytes: Number(existingFile.sizeBytes),
        uploaded_by: {
          id: existingFile.uploadedBy.id,
          full_name: existingFile.uploadedBy.fullName,
        },
        created_at: existingFile.createdAt.toISOString(),
      };
    }

    const fileObject = await this.prisma.fileObject.create({
      data: {
        companyId: user.companyId,
        projectId: dto.project_id,
        bucket: this.envService.s3Bucket,
        objectKey: dto.object_key,
        originalFilename: dto.original_filename,
        mimeType: dto.mime_type,
        sizeBytes: BigInt(dto.size_bytes),
        uploadedByUserId: user.userId,
      },
      include: {
        uploadedBy: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
    });

    await this.auditService.record({
      companyId: user.companyId,
      actorUserId: user.userId,
      projectId: dto.project_id,
      entityType: 'FILE_OBJECT',
      entityId: fileObject.id,
      action: 'UPLOADED',
      metadata: {
        projectId: dto.project_id,
        originalFilename: dto.original_filename,
      },
    });

    return {
      id: fileObject.id,
      original_filename: fileObject.originalFilename,
      mime_type: fileObject.mimeType,
      size_bytes: Number(fileObject.sizeBytes),
      uploaded_by: {
        id: fileObject.uploadedBy.id,
        full_name: fileObject.uploadedBy.fullName,
      },
      created_at: fileObject.createdAt.toISOString(),
    };
  }

  async listProjectFiles(user: PolicyUser, projectId: string): Promise<FileResponseDto[]> {
    const projectExists = await this.membershipService.verifyProjectExists({
      projectId,
      companyId: user.companyId,
    });

    if (!projectExists) {
      throw new NotFoundException('Project not found');
    }

    const isMember = await this.membershipService.isProjectMember({
      userId: user.userId,
      companyId: user.companyId,
      projectId,
    });

    if (!isMember) {
      throw new ForbiddenException('Not a project member');
    }

    const files = await this.prisma.fileObject.findMany({
      where: {
        projectId,
        companyId: user.companyId,
        deletedAt: null,
      },
      include: {
        uploadedBy: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return files.map((file) => ({
      id: file.id,
      original_filename: file.originalFilename,
      mime_type: file.mimeType,
      size_bytes: Number(file.sizeBytes),
      uploaded_by: {
        id: file.uploadedBy.id,
        full_name: file.uploadedBy.fullName,
      },
      created_at: file.createdAt.toISOString(),
    }));
  }
}
