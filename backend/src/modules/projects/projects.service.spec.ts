import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { PrismaService } from '../../infra/db/prisma.service';
import { AuditService } from '../audit/audit.service';
import { UserRole, ProjectStatus, ProjectRole } from '../../security/rbac';

describe('ProjectsService', () => {
  let service: ProjectsService;
  let mockPrismaFindMany: jest.Mock;
  let mockPrismaFindFirst: jest.Mock;
  let mockPrismaCreate: jest.Mock;
  let mockPrismaUpdate: jest.Mock;
  let mockTransaction: jest.Mock;
  let mockAuditRecord: jest.Mock;

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

  beforeEach(async () => {
    mockPrismaFindMany = jest.fn();
    mockPrismaFindFirst = jest.fn();
    mockPrismaCreate = jest.fn();
    mockPrismaUpdate = jest.fn();
    mockTransaction = jest.fn();
    mockAuditRecord = jest.fn();

    const mockPrismaService = {
      project: {
        findMany: mockPrismaFindMany,
        findFirst: mockPrismaFindFirst,
        create: mockPrismaCreate,
        update: mockPrismaUpdate,
      },
      $transaction: mockTransaction,
    };

    const mockAuditService = {
      record: mockAuditRecord,
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: AuditService,
          useValue: mockAuditService,
        },
      ],
    }).compile();

    service = module.get<ProjectsService>(ProjectsService);
  });

  describe('listProjects', () => {
    it('should return only projects where user is a member', async () => {
      const mockProjects = [
        {
          id: 'project-1',
          name: 'Project 1',
          status: 'ACTIVE',
          updatedAt: new Date('2026-01-29T12:00:00Z'),
        },
        {
          id: 'project-2',
          name: 'Project 2',
          status: 'ACTIVE',
          updatedAt: new Date('2026-01-28T12:00:00Z'),
        },
      ];

      mockPrismaFindMany.mockResolvedValue(mockProjects);

      const result = await service.listProjects(memberUser);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('project-1');
      expect(result[0].updated_at).toBe('2026-01-29T12:00:00.000Z');

      expect(mockPrismaFindMany).toHaveBeenCalledWith({
        where: {
          companyId: 'company-1',
          deletedAt: null,
          members: {
            some: {
              userId: 'user-2',
              companyId: 'company-1',
            },
          },
        },
        select: {
          id: true,
          name: true,
          status: true,
          updatedAt: true,
        },
        orderBy: {
          updatedAt: 'desc',
        },
      });
    });

    it('should scope query by companyId', async () => {
      mockPrismaFindMany.mockResolvedValue([]);

      await service.listProjects(memberUser);

      expect(mockPrismaFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            companyId: 'company-1',
          }),
        }),
      );
    });

    it('should exclude soft-deleted projects', async () => {
      mockPrismaFindMany.mockResolvedValue([]);

      await service.listProjects(memberUser);

      expect(mockPrismaFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            deletedAt: null,
          }),
        }),
      );
    });
  });

  describe('createProject', () => {
    it('should allow OWNER to create project', async () => {
      const dto = { name: 'New Project', location: 'Toronto' };
      const mockProject = {
        id: 'project-1',
        name: 'New Project',
        status: 'ACTIVE',
      };

      mockTransaction.mockImplementation(async (callback) => {
        const tx = {
          project: { create: jest.fn().mockResolvedValue(mockProject) },
          projectMember: { create: jest.fn() },
          auditEvent: { create: jest.fn() },
        };
        return callback(tx);
      });

      const result = await service.createProject(ownerUser, dto);

      expect(result).toEqual({
        id: 'project-1',
        name: 'New Project',
        status: 'ACTIVE',
      });
    });

    it('should deny MEMBER from creating project', async () => {
      const dto = { name: 'New Project' };

      await expect(service.createProject(memberUser, dto)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.createProject(memberUser, dto)).rejects.toThrow(
        'Only OWNER can create projects',
      );
    });

    it('should create project with correct data', async () => {
      const dto = { name: 'New Project', location: 'Toronto' };
      const mockProject = {
        id: 'project-1',
        name: 'New Project',
        status: 'ACTIVE',
      };

      const mockTxCreate = jest.fn().mockResolvedValue(mockProject);
      const mockMemberCreate = jest.fn();
      const mockAuditCreate = jest.fn();

      mockTransaction.mockImplementation(async (callback) => {
        const tx = {
          project: { create: mockTxCreate },
          projectMember: { create: mockMemberCreate },
          auditEvent: { create: mockAuditCreate },
        };
        return callback(tx);
      });

      await service.createProject(ownerUser, dto);

      expect(mockTxCreate).toHaveBeenCalledWith({
        data: {
          companyId: 'company-1',
          name: 'New Project',
          location: 'Toronto',
          status: ProjectStatus.ACTIVE,
        },
      });

      expect(mockMemberCreate).toHaveBeenCalledWith({
        data: {
          companyId: 'company-1',
          projectId: 'project-1',
          userId: 'user-1',
          projectRole: ProjectRole.OWNER,
        },
      });

      expect(mockAuditCreate).toHaveBeenCalledWith({
        data: {
          companyId: 'company-1',
          actorUserId: 'user-1',
          projectId: 'project-1',
          entityType: 'PROJECT',
          entityId: 'project-1',
          action: 'CREATED',
        },
      });
    });
  });

  describe('archiveProject', () => {
    it('should allow OWNER to archive project', async () => {
      const mockProject = {
        id: 'project-1',
        name: 'Project 1',
        status: 'ACTIVE',
        companyId: 'company-1',
      };

      const mockArchivedProject = {
        ...mockProject,
        status: 'ARCHIVED',
      };

      mockPrismaFindFirst.mockResolvedValue(mockProject);
      mockPrismaUpdate.mockResolvedValue(mockArchivedProject);

      const result = await service.archiveProject(ownerUser, 'project-1');

      expect(result).toEqual({
        id: 'project-1',
        name: 'Project 1',
        status: 'ARCHIVED',
      });

      expect(mockAuditRecord).toHaveBeenCalledWith({
        companyId: 'company-1',
        actorUserId: 'user-1',
        projectId: 'project-1',
        entityType: 'PROJECT',
        entityId: 'project-1',
        action: 'ARCHIVED',
      });
    });

    it('should deny MEMBER from archiving project', async () => {
      await expect(
        service.archiveProject(memberUser, 'project-1'),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.archiveProject(memberUser, 'project-1'),
      ).rejects.toThrow('Only OWNER can archive projects');
    });

    it('should throw NotFoundException if project does not exist', async () => {
      mockPrismaFindFirst.mockResolvedValue(null);

      await expect(
        service.archiveProject(ownerUser, 'nonexistent'),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.archiveProject(ownerUser, 'nonexistent'),
      ).rejects.toThrow('Project not found');
    });

    it('should scope project lookup by companyId', async () => {
      mockPrismaFindFirst.mockResolvedValue(null);

      await expect(
        service.archiveProject(ownerUser, 'project-1'),
      ).rejects.toThrow(NotFoundException);

      expect(mockPrismaFindFirst).toHaveBeenCalledWith({
        where: {
          id: 'project-1',
          companyId: 'company-1',
          deletedAt: null,
        },
      });
    });
  });
});
