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
import { PolicyUser, canDeleteFile, canDeleteFolder } from '../../security/rbac';
import { PresignRequestDto } from './dto/presign-request.dto';
import { PresignResponseDto, PresignBatchResponseDto } from './dto/presign-response.dto';
import { FinalizeRequestDto } from './dto/finalize-request.dto';
import { FileResponseDto } from './dto/file-response.dto';
import { CompanyFileListItemDto } from './dto/company-file-list-item.dto';
import { CompanyContentsDto } from './dto/company-contents.dto';
import { ProjectContentsDto } from './dto/project-contents.dto';
import { FolderListItemDto } from './dto/folder-list-item.dto';
import { CreateFolderDto } from './dto/create-folder.dto';
import { RenameFileDto } from './dto/rename-file.dto';
import { RenameFolderDto } from './dto/rename-folder.dto';

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

    let folderId: string | null = dto.folder_id ?? null;
    if (folderId != null) {
      const folder = await this.prisma.folder.findFirst({
        where: {
          id: folderId,
          companyId: user.companyId,
          deletedAt: null,
          ...(dto.project_id != null ? { projectId: dto.project_id } : { projectId: null }),
        },
      });
      if (!folder) {
        throw new NotFoundException('Folder not found');
      }
    }

    const fileObject = await this.prisma.fileObject.create({
      data: {
        companyId: user.companyId,
        projectId: dto.project_id ?? null,
        folderId,
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

  async listProjectContents(
    user: PolicyUser,
    projectId: string,
    folderId?: string | null,
  ): Promise<ProjectContentsDto> {
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

    const parentId = folderId ?? null;
    if (folderId != null) {
      const parentFolder = await this.prisma.folder.findFirst({
        where: {
          id: folderId,
          companyId: user.companyId,
          projectId,
          deletedAt: null,
        },
      });
      if (!parentFolder) {
        throw new NotFoundException('Folder not found');
      }
    }

    const [folders, files, allProjectFolders, allProjectFiles] = await Promise.all([
      this.prisma.folder.findMany({
        where: {
          companyId: user.companyId,
          projectId,
          parentFolderId: parentId,
          deletedAt: null,
        },
        orderBy: { name: 'asc' },
      }),
      this.prisma.fileObject.findMany({
        where: {
          projectId,
          companyId: user.companyId,
          folderId: parentId,
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
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.folder.findMany({
        where: {
          companyId: user.companyId,
          projectId,
          deletedAt: null,
        },
        select: { id: true, parentFolderId: true },
      }),
      this.prisma.fileObject.findMany({
        where: {
          projectId,
          companyId: user.companyId,
          deletedAt: null,
        },
        select: { folderId: true, sizeBytes: true },
      }),
    ]);

    const folderTotalSizes = this.computeFolderTotalSizes(allProjectFolders, allProjectFiles);

    return {
      folders: folders.map((f) => ({
        id: f.id,
        name: f.name,
        parent_folder_id: f.parentFolderId,
        created_at: f.createdAt.toISOString(),
        total_size_bytes: folderTotalSizes[f.id] ?? 0,
      })),
      files: files.map((file) => ({
        id: file.id,
        original_filename: file.originalFilename,
        mime_type: file.mimeType,
        size_bytes: Number(file.sizeBytes),
        uploaded_by: {
          id: file.uploadedBy.id,
          full_name: file.uploadedBy.fullName,
        },
        created_at: file.createdAt.toISOString(),
      })),
    };
  }

  async createProjectFolder(
    user: PolicyUser,
    projectId: string,
    dto: CreateFolderDto,
  ): Promise<FolderListItemDto> {
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

    const parentId = dto.parent_folder_id ?? null;
    if (parentId != null) {
      const parentFolder = await this.prisma.folder.findFirst({
        where: {
          id: parentId,
          companyId: user.companyId,
          projectId,
          deletedAt: null,
        },
      });
      if (!parentFolder) {
        throw new NotFoundException('Parent folder not found');
      }
    }

    const name = dto.name.trim();
    if (!name) {
      throw new BadRequestException('Folder name is required');
    }

    const existing = await this.prisma.folder.findFirst({
      where: {
        companyId: user.companyId,
        projectId,
        parentFolderId: parentId,
        name,
        deletedAt: null,
      },
    });
    if (existing) {
      throw new ConflictException('A folder with this name already exists in this location');
    }

    const folder = await this.prisma.folder.create({
      data: {
        companyId: user.companyId,
        projectId,
        parentFolderId: parentId,
        name,
      },
    });

    await this.auditService.record({
      companyId: user.companyId,
      actorUserId: user.userId,
      projectId,
      entityType: 'FOLDER',
      entityId: folder.id,
      action: 'CREATED',
      metadata: { name, parentFolderId: parentId },
    });

    return {
      id: folder.id,
      name: folder.name,
      parent_folder_id: folder.parentFolderId,
      created_at: folder.createdAt.toISOString(),
      total_size_bytes: 0,
    };
  }

  async listCompanyContents(
    user: PolicyUser,
    folderId?: string | null,
  ): Promise<CompanyContentsDto> {
    const parentId = folderId ?? null;
    if (folderId != null) {
      const parentFolder = await this.prisma.folder.findFirst({
        where: {
          id: folderId,
          companyId: user.companyId,
          projectId: null,
          deletedAt: null,
        },
      });
      if (!parentFolder) {
        throw new NotFoundException('Folder not found');
      }
    }

    const [folders, files, allCompanyFolders, allCompanyFiles] = await Promise.all([
      this.prisma.folder.findMany({
        where: {
          companyId: user.companyId,
          projectId: null,
          parentFolderId: parentId,
          deletedAt: null,
        },
        orderBy: { name: 'asc' },
      }),
      this.prisma.fileObject.findMany({
        where: {
          companyId: user.companyId,
          projectId: null,
          folderId: parentId,
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
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.folder.findMany({
        where: {
          companyId: user.companyId,
          projectId: null,
          deletedAt: null,
        },
        select: { id: true, parentFolderId: true },
      }),
      this.prisma.fileObject.findMany({
        where: {
          companyId: user.companyId,
          projectId: null,
          deletedAt: null,
        },
        select: { folderId: true, sizeBytes: true },
      }),
    ]);

    const folderTotalSizes = this.computeFolderTotalSizes(allCompanyFolders, allCompanyFiles);

    return {
      folders: folders.map((f) => ({
        id: f.id,
        name: f.name,
        parent_folder_id: f.parentFolderId,
        created_at: f.createdAt.toISOString(),
        total_size_bytes: folderTotalSizes[f.id] ?? 0,
      })),
      files: files.map((file) => ({
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
      })),
    };
  }

  async createCompanyFolder(user: PolicyUser, dto: CreateFolderDto): Promise<FolderListItemDto> {
    const parentId = dto.parent_folder_id ?? null;
    if (parentId != null) {
      const parentFolder = await this.prisma.folder.findFirst({
        where: {
          id: parentId,
          companyId: user.companyId,
          projectId: null,
          deletedAt: null,
        },
      });
      if (!parentFolder) {
        throw new NotFoundException('Parent folder not found');
      }
    }

    const name = dto.name.trim();
    if (!name) {
      throw new BadRequestException('Folder name is required');
    }

    const existing = await this.prisma.folder.findFirst({
      where: {
        companyId: user.companyId,
        projectId: null,
        parentFolderId: parentId,
        name,
        deletedAt: null,
      },
    });
    if (existing) {
      throw new ConflictException('A folder with this name already exists in this location');
    }

    const folder = await this.prisma.folder.create({
      data: {
        companyId: user.companyId,
        projectId: null,
        parentFolderId: parentId,
        name,
      },
    });

    await this.auditService.record({
      companyId: user.companyId,
      actorUserId: user.userId,
      entityType: 'FOLDER',
      entityId: folder.id,
      action: 'CREATED',
      metadata: { name, parentFolderId: parentId },
    });

    return {
      id: folder.id,
      name: folder.name,
      parent_folder_id: folder.parentFolderId,
      created_at: folder.createdAt.toISOString(),
      total_size_bytes: 0,
    };
  }

  async renameProjectFolder(
    user: PolicyUser,
    projectId: string,
    folderId: string,
    dto: RenameFolderDto,
  ): Promise<FolderListItemDto> {
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

    const folder = await this.prisma.folder.findFirst({
      where: {
        id: folderId,
        companyId: user.companyId,
        projectId,
        deletedAt: null,
      },
    });
    if (!folder) {
      throw new NotFoundException('Folder not found');
    }

    const name = dto.name.trim();
    if (!name) {
      throw new BadRequestException('Folder name is required');
    }
    const existing = await this.prisma.folder.findFirst({
      where: {
        companyId: user.companyId,
        projectId,
        parentFolderId: folder.parentFolderId,
        name,
        deletedAt: null,
        id: { not: folderId },
      },
    });
    if (existing) {
      throw new ConflictException('A folder with this name already exists in this location');
    }

    const updated = await this.prisma.folder.update({
      where: { id: folderId },
      data: { name },
    });

    await this.auditService.record({
      companyId: user.companyId,
      actorUserId: user.userId,
      projectId,
      entityType: 'FOLDER',
      entityId: folder.id,
      action: 'RENAMED',
      metadata: { previousName: folder.name, newName: name },
    });

    const totalSizes = await this.getFolderTotalSizeForProject(user.companyId, projectId, [
      folderId,
    ]);
    return {
      id: updated.id,
      name: updated.name,
      parent_folder_id: updated.parentFolderId,
      created_at: updated.createdAt.toISOString(),
      total_size_bytes: totalSizes[folderId] ?? 0,
    };
  }

  async renameCompanyFolder(
    user: PolicyUser,
    folderId: string,
    dto: RenameFolderDto,
  ): Promise<FolderListItemDto> {
    const folder = await this.prisma.folder.findFirst({
      where: {
        id: folderId,
        companyId: user.companyId,
        projectId: null,
        deletedAt: null,
      },
    });
    if (!folder) {
      throw new NotFoundException('Folder not found');
    }

    const name = dto.name.trim();
    if (!name) {
      throw new BadRequestException('Folder name is required');
    }
    const existing = await this.prisma.folder.findFirst({
      where: {
        companyId: user.companyId,
        projectId: null,
        parentFolderId: folder.parentFolderId,
        name,
        deletedAt: null,
        id: { not: folderId },
      },
    });
    if (existing) {
      throw new ConflictException('A folder with this name already exists in this location');
    }

    const updated = await this.prisma.folder.update({
      where: { id: folderId },
      data: { name },
    });

    await this.auditService.record({
      companyId: user.companyId,
      actorUserId: user.userId,
      entityType: 'FOLDER',
      entityId: folder.id,
      action: 'RENAMED',
      metadata: { previousName: folder.name, newName: name },
    });

    const totalSizes = await this.getFolderTotalSizeForCompany(user.companyId, [folderId]);
    return {
      id: updated.id,
      name: updated.name,
      parent_folder_id: updated.parentFolderId,
      created_at: updated.createdAt.toISOString(),
      total_size_bytes: totalSizes[folderId] ?? 0,
    };
  }

  /** Returns folder id -> total size (bytes) for given folder IDs (project scope). */
  private async getFolderTotalSizeForProject(
    companyId: string,
    projectId: string,
    folderIds: string[],
  ): Promise<Record<string, number>> {
    if (folderIds.length === 0) return {};
    const [allFolders, allFiles] = await Promise.all([
      this.prisma.folder.findMany({
        where: { companyId, projectId, deletedAt: null },
        select: { id: true, parentFolderId: true },
      }),
      this.prisma.fileObject.findMany({
        where: { projectId, deletedAt: null },
        select: { folderId: true, sizeBytes: true },
      }),
    ]);
    return this.computeFolderTotalSizes(
      allFolders,
      allFiles.map((f) => ({ folderId: f.folderId, sizeBytes: f.sizeBytes })),
    );
  }

  /** Returns folder id -> total size (bytes) for given folder IDs (company scope). */
  private async getFolderTotalSizeForCompany(
    companyId: string,
    folderIds: string[],
  ): Promise<Record<string, number>> {
    if (folderIds.length === 0) return {};
    const [allFolders, allFiles] = await Promise.all([
      this.prisma.folder.findMany({
        where: { companyId, projectId: null, deletedAt: null },
        select: { id: true, parentFolderId: true },
      }),
      this.prisma.fileObject.findMany({
        where: { companyId, projectId: null, deletedAt: null },
        select: { folderId: true, sizeBytes: true },
      }),
    ]);
    return this.computeFolderTotalSizes(
      allFolders,
      allFiles.map((f) => ({ folderId: f.folderId, sizeBytes: f.sizeBytes })),
    );
  }

  /** Collect all descendant folder IDs (including nested). */
  private async getDescendantFolderIds(
    companyId: string,
    projectId: string | null,
    parentFolderId: string,
  ): Promise<string[]> {
    const all = await this.prisma.folder.findMany({
      where: { companyId, projectId, deletedAt: null },
      select: { id: true, parentFolderId: true },
    });
    const byParent = new Map<string | null, { id: string }[]>();
    for (const f of all) {
      const key = f.parentFolderId ?? null;
      if (!byParent.has(key)) byParent.set(key, []);
      byParent.get(key)!.push({ id: f.id });
    }
    const result: string[] = [];
    function visit(pid: string) {
      for (const child of byParent.get(pid) ?? []) {
        result.push(child.id);
        visit(child.id);
      }
    }
    visit(parentFolderId);
    return result;
  }

  async deleteProjectFolder(user: PolicyUser, projectId: string, folderId: string): Promise<void> {
    if (!canDeleteFolder(user)) {
      throw new ForbiddenException('Only OWNER can delete folders');
    }
    const projectExists = await this.membershipService.verifyProjectExists({
      projectId,
      companyId: user.companyId,
    });
    if (!projectExists) {
      throw new NotFoundException('Project not found');
    }

    const folder = await this.prisma.folder.findFirst({
      where: {
        id: folderId,
        companyId: user.companyId,
        projectId,
        deletedAt: null,
      },
    });
    if (!folder) {
      throw new NotFoundException('Folder not found');
    }

    const descendantIds = await this.getDescendantFolderIds(user.companyId, projectId, folderId);
    const allFolderIdsToDelete = [folderId, ...descendantIds];
    const parentId = folder.parentFolderId;

    await this.prisma.fileObject.updateMany({
      where: { folderId: { in: allFolderIdsToDelete } },
      data: { folderId: parentId },
    });

    await this.prisma.folder.updateMany({
      where: { id: { in: allFolderIdsToDelete } },
      data: { deletedAt: new Date() },
    });

    await this.auditService.record({
      companyId: user.companyId,
      actorUserId: user.userId,
      projectId,
      entityType: 'FOLDER',
      entityId: folderId,
      action: 'DELETED',
      metadata: { name: folder.name, movedFilesToParent: true },
    });
  }

  async deleteCompanyFolder(user: PolicyUser, folderId: string): Promise<void> {
    if (!canDeleteFolder(user)) {
      throw new ForbiddenException('Only OWNER can delete folders');
    }

    const folder = await this.prisma.folder.findFirst({
      where: {
        id: folderId,
        companyId: user.companyId,
        projectId: null,
        deletedAt: null,
      },
    });
    if (!folder) {
      throw new NotFoundException('Folder not found');
    }

    const descendantIds = await this.getDescendantFolderIds(user.companyId, null, folderId);
    const allFolderIdsToDelete = [folderId, ...descendantIds];
    const parentId = folder.parentFolderId;

    await this.prisma.fileObject.updateMany({
      where: { folderId: { in: allFolderIdsToDelete } },
      data: { folderId: parentId },
    });

    await this.prisma.folder.updateMany({
      where: { id: { in: allFolderIdsToDelete } },
      data: { deletedAt: new Date() },
    });

    await this.auditService.record({
      companyId: user.companyId,
      actorUserId: user.userId,
      entityType: 'FOLDER',
      entityId: folderId,
      action: 'DELETED',
      metadata: { name: folder.name, movedFilesToParent: true },
    });
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

  /**
   * Computes total size (bytes) per folder: sum of all files in that folder and all descendants.
   */
  private computeFolderTotalSizes(
    folders: { id: string; parentFolderId: string | null }[],
    files: { folderId: string | null; sizeBytes: bigint }[],
  ): Record<string, number> {
    const totalSize: Record<string, number> = {};
    for (const file of files) {
      if (file.folderId == null) continue;
      totalSize[file.folderId] = (totalSize[file.folderId] ?? 0) + Number(file.sizeBytes);
    }
    const childrenByParent = new Map<string | null, string[]>();
    for (const f of folders) {
      const key = f.parentFolderId ?? null;
      if (!childrenByParent.has(key)) childrenByParent.set(key, []);
      childrenByParent.get(key)!.push(f.id);
    }
    const postOrder: string[] = [];
    function visit(parentKey: string | null) {
      for (const id of childrenByParent.get(parentKey) ?? []) {
        visit(id);
        postOrder.push(id);
      }
    }
    visit(null);
    for (let i = postOrder.length - 1; i >= 0; i--) {
      const folderId = postOrder[i];
      const children = childrenByParent.get(folderId) ?? [];
      for (const childId of children) {
        totalSize[folderId] = (totalSize[folderId] ?? 0) + (totalSize[childId] ?? 0);
      }
    }
    return totalSize;
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
