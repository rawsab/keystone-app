import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { FilesService } from './files.service';
import { PrismaService } from '../../infra/db/prisma.service';
import { AuditService } from '../audit/audit.service';
import { MembershipService } from '../../security/rbac/membership.service';
import { S3Service } from '../../infra/storage/s3.service';
import { EnvService } from '../../config/env.service';
import { UserRole } from '../../security/rbac';

describe('FilesService', () => {
  let service: FilesService;
  let mockPrismaCreate: jest.Mock;
  let mockPrismaFindMany: jest.Mock;
  let mockPrismaFindFirst: jest.Mock;
  let mockMembershipVerifyProjectExists: jest.Mock;
  let mockMembershipIsProjectMember: jest.Mock;
  let mockS3GeneratePresignedUrl: jest.Mock;
  let mockS3ValidateObjectKeyPrefix: jest.Mock;
  let mockAuditRecord: jest.Mock;
  let mockEnvService: { s3Bucket: string };

  const ownerUser = {
    userId: 'user-1',
    companyId: 'company-1',
    role: UserRole.OWNER,
  };

  const memberUser = {
    userId: 'user-2',
    companyId: 'company-1',
    role: UserRole.MEMBER,
  };

  const projectId = 'project-1';

  beforeEach(async () => {
    mockPrismaCreate = jest.fn();
    mockPrismaFindMany = jest.fn();
    mockPrismaFindFirst = jest.fn();
    mockMembershipVerifyProjectExists = jest.fn();
    mockMembershipIsProjectMember = jest.fn();
    mockS3GeneratePresignedUrl = jest.fn();
    mockS3ValidateObjectKeyPrefix = jest.fn();
    mockAuditRecord = jest.fn();
    mockEnvService = { s3Bucket: 'test-bucket' };

    const mockPrismaService = {
      fileObject: {
        create: mockPrismaCreate,
        findMany: mockPrismaFindMany,
        findFirst: mockPrismaFindFirst,
      },
    };

    const mockMembershipService = {
      verifyProjectExists: mockMembershipVerifyProjectExists,
      isProjectMember: mockMembershipIsProjectMember,
    };

    const mockS3ServiceInstance = {
      generatePresignedUploadUrl: mockS3GeneratePresignedUrl,
      validateObjectKeyPrefix: mockS3ValidateObjectKeyPrefix,
    };

    const mockAuditService = {
      record: mockAuditRecord,
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FilesService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: MembershipService,
          useValue: mockMembershipService,
        },
        {
          provide: S3Service,
          useValue: mockS3ServiceInstance,
        },
        {
          provide: AuditService,
          useValue: mockAuditService,
        },
        {
          provide: EnvService,
          useValue: mockEnvService,
        },
      ],
    }).compile();

    service = module.get<FilesService>(FilesService);
  });

  describe('presignUpload', () => {
    const singleFileDto = {
      project_id: projectId,
      original_filename: 'photo.jpg',
      mime_type: 'image/jpeg',
      size_bytes: 123456,
    };

    it('should allow project member to presign single file', async () => {
      mockMembershipVerifyProjectExists.mockResolvedValue(true);
      mockMembershipIsProjectMember.mockResolvedValue(true);
      mockS3GeneratePresignedUrl.mockResolvedValue({
        uploadUrl: 'https://s3-presigned-url',
        objectKey: 'companies/company-1/projects/project-1/files/uuid',
      });

      const result = await service.presignUpload(memberUser, singleFileDto);

      expect(result).toEqual({
        upload_url: 'https://s3-presigned-url',
        object_key: 'companies/company-1/projects/project-1/files/uuid',
      });

      expect(mockS3GeneratePresignedUrl).toHaveBeenCalledWith({
        companyId: 'company-1',
        projectId,
        mimeType: 'image/jpeg',
      });
    });

    it('should deny non-member from presigning', async () => {
      mockMembershipVerifyProjectExists.mockResolvedValue(true);
      mockMembershipIsProjectMember.mockResolvedValue(false);

      await expect(service.presignUpload(memberUser, singleFileDto)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.presignUpload(memberUser, singleFileDto)).rejects.toThrow(
        'Not a project member',
      );
    });

    it('should throw NotFoundException if project does not exist', async () => {
      mockMembershipVerifyProjectExists.mockResolvedValue(false);

      await expect(service.presignUpload(memberUser, singleFileDto)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.presignUpload(memberUser, singleFileDto)).rejects.toThrow(
        'Project not found',
      );
    });

    it('should support batch presign', async () => {
      const batchDto = {
        project_id: projectId,
        files: [
          {
            original_filename: 'photo1.jpg',
            mime_type: 'image/jpeg',
            size_bytes: 123456,
          },
          {
            original_filename: 'photo2.jpg',
            mime_type: 'image/jpeg',
            size_bytes: 234567,
          },
        ],
      };

      mockMembershipVerifyProjectExists.mockResolvedValue(true);
      mockMembershipIsProjectMember.mockResolvedValue(true);
      mockS3GeneratePresignedUrl
        .mockResolvedValueOnce({
          uploadUrl: 'https://s3-url-1',
          objectKey: 'companies/company-1/projects/project-1/files/uuid-1',
        })
        .mockResolvedValueOnce({
          uploadUrl: 'https://s3-url-2',
          objectKey: 'companies/company-1/projects/project-1/files/uuid-2',
        });

      const result = await service.presignUpload(memberUser, batchDto);

      expect(result).toEqual({
        items: [
          {
            upload_url: 'https://s3-url-1',
            object_key: 'companies/company-1/projects/project-1/files/uuid-1',
            original_filename: 'photo1.jpg',
          },
          {
            upload_url: 'https://s3-url-2',
            object_key: 'companies/company-1/projects/project-1/files/uuid-2',
            original_filename: 'photo2.jpg',
          },
        ],
      });
    });

    it('should throw BadRequestException for incomplete single file request', async () => {
      const incompleteDto = {
        project_id: projectId,
        original_filename: 'photo.jpg',
      };

      mockMembershipVerifyProjectExists.mockResolvedValue(true);
      mockMembershipIsProjectMember.mockResolvedValue(true);

      await expect(service.presignUpload(memberUser, incompleteDto as any)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('finalizeUpload', () => {
    const finalizeDto = {
      project_id: projectId,
      object_key: 'companies/company-1/projects/project-1/files/uuid',
      original_filename: 'photo.jpg',
      mime_type: 'image/jpeg',
      size_bytes: 123456,
    };

    it('should allow project member to finalize upload', async () => {
      mockMembershipVerifyProjectExists.mockResolvedValue(true);
      mockMembershipIsProjectMember.mockResolvedValue(true);
      mockS3ValidateObjectKeyPrefix.mockReturnValue(true);
      mockPrismaFindFirst.mockResolvedValue(null);
      mockPrismaCreate.mockResolvedValue({
        id: 'file-1',
        originalFilename: 'photo.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: BigInt(123456),
        createdAt: new Date('2026-01-29T15:00:00Z'),
        uploadedBy: {
          id: 'user-2',
          fullName: 'Jane Member',
        },
      });

      const result = await service.finalizeUpload(memberUser, finalizeDto);

      expect(result).toEqual({
        id: 'file-1',
        original_filename: 'photo.jpg',
        mime_type: 'image/jpeg',
        size_bytes: 123456,
        uploaded_by: {
          id: 'user-2',
          full_name: 'Jane Member',
        },
        created_at: '2026-01-29T15:00:00.000Z',
      });

      expect(mockPrismaCreate).toHaveBeenCalledWith({
        data: {
          companyId: 'company-1',
          projectId,
          bucket: 'test-bucket',
          objectKey: finalizeDto.object_key,
          originalFilename: 'photo.jpg',
          mimeType: 'image/jpeg',
          sizeBytes: BigInt(123456),
          uploadedByUserId: 'user-2',
        },
        include: expect.any(Object),
      });

      expect(mockAuditRecord).toHaveBeenCalledWith({
        companyId: 'company-1',
        actorUserId: 'user-2',
        projectId,
        entityType: 'FILE_OBJECT',
        entityId: 'file-1',
        action: 'UPLOADED',
        metadata: {
          projectId,
          originalFilename: 'photo.jpg',
        },
      });
    });

    it('should deny non-member from finalizing', async () => {
      mockMembershipVerifyProjectExists.mockResolvedValue(true);
      mockMembershipIsProjectMember.mockResolvedValue(false);

      await expect(service.finalizeUpload(memberUser, finalizeDto)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.finalizeUpload(memberUser, finalizeDto)).rejects.toThrow(
        'Not a project member',
      );
    });

    it('should throw NotFoundException if project does not exist', async () => {
      mockMembershipVerifyProjectExists.mockResolvedValue(false);

      await expect(service.finalizeUpload(memberUser, finalizeDto)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.finalizeUpload(memberUser, finalizeDto)).rejects.toThrow(
        'Project not found',
      );
    });

    it('should reject object_key with wrong company prefix', async () => {
      const wrongCompanyDto = {
        ...finalizeDto,
        object_key: 'companies/wrong-company/projects/project-1/files/uuid',
      };

      mockMembershipVerifyProjectExists.mockResolvedValue(true);
      mockMembershipIsProjectMember.mockResolvedValue(true);
      mockS3ValidateObjectKeyPrefix.mockReturnValue(false);

      await expect(service.finalizeUpload(memberUser, wrongCompanyDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.finalizeUpload(memberUser, wrongCompanyDto)).rejects.toThrow(
        'Invalid object_key prefix',
      );
    });

    it('should reject object_key with wrong project prefix', async () => {
      const wrongProjectDto = {
        ...finalizeDto,
        object_key: 'companies/company-1/projects/wrong-project/files/uuid',
      };

      mockMembershipVerifyProjectExists.mockResolvedValue(true);
      mockMembershipIsProjectMember.mockResolvedValue(true);
      mockS3ValidateObjectKeyPrefix.mockReturnValue(false);

      await expect(service.finalizeUpload(memberUser, wrongProjectDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.finalizeUpload(memberUser, wrongProjectDto)).rejects.toThrow(
        'Invalid object_key prefix',
      );
    });

    it('should be idempotent - return existing file if already finalized', async () => {
      mockMembershipVerifyProjectExists.mockResolvedValue(true);
      mockMembershipIsProjectMember.mockResolvedValue(true);
      mockS3ValidateObjectKeyPrefix.mockReturnValue(true);
      mockPrismaFindFirst.mockResolvedValue({
        id: 'existing-file-1',
        originalFilename: 'photo.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: BigInt(123456),
        createdAt: new Date('2026-01-29T15:00:00Z'),
        uploadedBy: {
          id: 'user-2',
          fullName: 'Jane Member',
        },
      });

      const result = await service.finalizeUpload(memberUser, finalizeDto);

      expect(result).toEqual({
        id: 'existing-file-1',
        original_filename: 'photo.jpg',
        mime_type: 'image/jpeg',
        size_bytes: 123456,
        uploaded_by: {
          id: 'user-2',
          full_name: 'Jane Member',
        },
        created_at: '2026-01-29T15:00:00.000Z',
      });

      expect(mockPrismaCreate).not.toHaveBeenCalled();
      expect(mockAuditRecord).not.toHaveBeenCalled();
    });
  });

  describe('listProjectFiles', () => {
    it('should allow project member to list files', async () => {
      mockMembershipVerifyProjectExists.mockResolvedValue(true);
      mockMembershipIsProjectMember.mockResolvedValue(true);
      mockPrismaFindMany.mockResolvedValue([
        {
          id: 'file-1',
          originalFilename: 'photo1.jpg',
          mimeType: 'image/jpeg',
          sizeBytes: BigInt(123456),
          createdAt: new Date('2026-01-29T15:00:00Z'),
          uploadedBy: {
            id: 'user-1',
            fullName: 'John Owner',
          },
        },
        {
          id: 'file-2',
          originalFilename: 'photo2.jpg',
          mimeType: 'image/jpeg',
          sizeBytes: BigInt(234567),
          createdAt: new Date('2026-01-29T14:00:00Z'),
          uploadedBy: {
            id: 'user-2',
            fullName: 'Jane Member',
          },
        },
      ]);

      const result = await service.listProjectFiles(memberUser, projectId);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 'file-1',
        original_filename: 'photo1.jpg',
        mime_type: 'image/jpeg',
        size_bytes: 123456,
        uploaded_by: {
          id: 'user-1',
          full_name: 'John Owner',
        },
        created_at: '2026-01-29T15:00:00.000Z',
      });

      expect(mockPrismaFindMany).toHaveBeenCalledWith({
        where: {
          projectId,
          companyId: 'company-1',
          deletedAt: null,
        },
        include: expect.any(Object),
        orderBy: {
          createdAt: 'desc',
        },
      });
    });

    it('should deny non-member from listing files', async () => {
      mockMembershipVerifyProjectExists.mockResolvedValue(true);
      mockMembershipIsProjectMember.mockResolvedValue(false);

      await expect(service.listProjectFiles(memberUser, projectId)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.listProjectFiles(memberUser, projectId)).rejects.toThrow(
        'Not a project member',
      );
    });

    it('should throw NotFoundException if project does not exist', async () => {
      mockMembershipVerifyProjectExists.mockResolvedValue(false);

      await expect(service.listProjectFiles(memberUser, projectId)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.listProjectFiles(memberUser, projectId)).rejects.toThrow(
        'Project not found',
      );
    });

    it('should scope query by companyId and exclude deleted files', async () => {
      mockMembershipVerifyProjectExists.mockResolvedValue(true);
      mockMembershipIsProjectMember.mockResolvedValue(true);
      mockPrismaFindMany.mockResolvedValue([]);

      await service.listProjectFiles(memberUser, projectId);

      expect(mockPrismaFindMany).toHaveBeenCalledWith({
        where: {
          projectId,
          companyId: 'company-1',
          deletedAt: null,
        },
        include: expect.any(Object),
        orderBy: {
          createdAt: 'desc',
        },
      });
    });
  });
});
