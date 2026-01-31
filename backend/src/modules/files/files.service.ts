import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../infra/db/prisma.service';
import { AuditService } from '../audit/audit.service';
import { MembershipService } from '../../security/rbac/membership.service';
import { S3Service } from '../../infra/storage/s3.service';
import { EnvService } from '../../config/env.service';
import { PolicyUser, canDeleteFile } from '../../security/rbac';
import { PresignRequestDto } from './dto/presign-request.dto';
import { PresignResponseDto, PresignBatchResponseDto } from './dto/presign-response.dto';
import { FinalizeRequestDto } from './dto/finalize-request.dto';
import { FileResponseDto } from './dto/file-response.dto';
import { CompanyFileListItemDto } from './dto/company-file-list-item.dto';
import { RenameFileDto } from './dto/rename-file.dto';

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
    if (dto.project_id != null) {
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
    }

    if (dto.files && dto.files.length > 0) {
      if (dto.project_id == null) {
        throw new BadRequestException('Batch presign requires project_id');
      }
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
      projectId: dto.project_id ?? undefined,
      mimeType: dto.mime_type,
    });

    return {
      upload_url: result.uploadUrl,
      object_key: result.objectKey,
    };
  }

  async finalizeUpload(user: PolicyUser, dto: FinalizeRequestDto): Promise<FileResponseDto> {
    if (dto.project_id != null) {
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
    }

    const isValidPrefix = this.s3Service.validateObjectKeyPrefix({
      objectKey: dto.object_key,
      companyId: user.companyId,
      projectId: dto.project_id ?? undefined,
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
        projectId: dto.project_id ?? null,
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
      projectId: dto.project_id ?? undefined,
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

  async listCompanyFiles(user: PolicyUser): Promise<CompanyFileListItemDto[]> {
    const files = await this.prisma.fileObject.findMany({
      where: {
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
        project: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return files.map((file) => ({
      id: file.id,
      file_name: file.originalFilename,
      mime_type: file.mimeType,
      size_bytes: Number(file.sizeBytes),
      created_at: file.createdAt.toISOString(),
      uploaded_by: {
        id: file.uploadedBy.id,
        full_name: file.uploadedBy.fullName,
      },
      project_id: file.projectId,
      project_name: file.project?.name ?? null,
      object_key: file.objectKey,
    }));
  }

  async deleteFile(user: PolicyUser, fileObjectId: string): Promise<void> {
    if (!canDeleteFile(user)) {
      throw new ForbiddenException('Only OWNER can delete files');
    }

    const file = await this.prisma.fileObject.findFirst({
      where: {
        id: fileObjectId,
        companyId: user.companyId,
        deletedAt: null,
      },
      include: {
        _count: {
          select: {
            attachments: true,
          },
        },
      },
    });

    if (!file) {
      throw new NotFoundException('File not found');
    }

    if (file._count.attachments > 0) {
      throw new ConflictException(
        'File is attached to one or more daily reports and cannot be deleted',
      );
    }

    await this.prisma.fileObject.update({
      where: { id: fileObjectId },
      data: { deletedAt: new Date() },
    });

    await this.auditService.record({
      companyId: user.companyId,
      actorUserId: user.userId,
      projectId: file.projectId ?? undefined,
      entityType: 'FILE_OBJECT',
      entityId: file.id,
      action: 'DELETED',
    });
  }

  async getDownloadUrl(
    user: PolicyUser,
    fileObjectId: string,
    options?: { preview?: boolean },
  ): Promise<string> {
    const file = await this.prisma.fileObject.findFirst({
      where: {
        id: fileObjectId,
        companyId: user.companyId,
        deletedAt: null,
      },
    });

    if (!file) {
      throw new NotFoundException('File not found');
    }

    if (file.projectId != null) {
      const isMember = await this.membershipService.isProjectMember({
        userId: user.userId,
        companyId: user.companyId,
        projectId: file.projectId,
      });
      if (!isMember) {
        throw new ForbiddenException('Not a project member');
      }
    }

    // For preview/thumbnail, omit Content-Disposition so the presigned URL doesn't depend on
    // the filename (spaces, dots, special chars can break signature encoding).
    if (options?.preview) {
      return this.s3Service.getPresignedDownloadUrl(file.objectKey);
    }

    const contentDisposition = `attachment; filename="${this.escapeContentDispositionFilename(file.originalFilename)}"`;
    return this.s3Service.getPresignedDownloadUrl(file.objectKey, {
      responseContentDisposition: contentDisposition,
    });
  }

  private escapeContentDispositionFilename(name: string): string {
    return name.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  }

  async renameFile(
    user: PolicyUser,
    fileObjectId: string,
    dto: RenameFileDto,
  ): Promise<FileResponseDto> {
    const file = await this.prisma.fileObject.findFirst({
      where: {
        id: fileObjectId,
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
    });

    if (!file) {
      throw new NotFoundException('File not found');
    }

    if (file.projectId != null) {
      const isMember = await this.membershipService.isProjectMember({
        userId: user.userId,
        companyId: user.companyId,
        projectId: file.projectId,
      });
      if (!isMember) {
        throw new ForbiddenException('Not a project member');
      }
    }

    const newName = dto.file_name.trim();
    if (!newName) {
      throw new BadRequestException('File name is required');
    }

    const updated = await this.prisma.fileObject.update({
      where: { id: fileObjectId },
      data: { originalFilename: newName },
      include: {
        uploadedBy: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
    });

    // Skip S3 metadata update when using LocalStack; it often fails on copy-to-self (404/InvalidRequest).
    // DB name is already updated; with real AWS we update Content-Disposition for download filename.
    const contentDisposition = `attachment; filename="${this.escapeContentDispositionFilename(newName)}"`;
    if (!this.envService.s3Endpoint) {
      try {
        await this.s3Service.setObjectContentDisposition(
          file.objectKey,
          contentDisposition,
          file.mimeType,
        );
      } catch {
        // DB is already updated; S3 metadata update is best-effort for display on download
      }
    }

    await this.auditService.record({
      companyId: user.companyId,
      actorUserId: user.userId,
      projectId: file.projectId ?? undefined,
      entityType: 'FILE_OBJECT',
      entityId: file.id,
      action: 'RENAMED',
      metadata: {
        previousName: file.originalFilename,
        newName: newName,
      },
    });

    return {
      id: updated.id,
      original_filename: updated.originalFilename,
      mime_type: updated.mimeType,
      size_bytes: Number(updated.sizeBytes),
      uploaded_by: {
        id: updated.uploadedBy.id,
        full_name: updated.uploadedBy.fullName,
      },
      created_at: updated.createdAt.toISOString(),
    };
  }
}
