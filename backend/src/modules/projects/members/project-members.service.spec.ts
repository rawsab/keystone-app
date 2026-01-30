import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ProjectMembersService } from './project-members.service';
import { PrismaService } from '../../../infra/db/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { MembershipService } from '../../../security/rbac/membership.service';
import { UserRole, ProjectRole } from '../../../security/rbac';

describe('ProjectMembersService', () => {
  let service: ProjectMembersService;
  let mockPrismaFindMany: jest.Mock;
  let mockPrismaMemberFindFirst: jest.Mock;
  let mockPrismaUserFindFirst: jest.Mock;
  let mockPrismaCreate: jest.Mock;
  let mockMembershipVerifyProjectExists: jest.Mock;
  let mockMembershipIsProjectMember: jest.Mock;
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

  const projectId = 'project-1';

  beforeEach(async () => {
    mockPrismaFindMany = jest.fn();
    mockPrismaMemberFindFirst = jest.fn();
    mockPrismaUserFindFirst = jest.fn();
    mockPrismaCreate = jest.fn();
    mockMembershipVerifyProjectExists = jest.fn();
    mockMembershipIsProjectMember = jest.fn();
    mockAuditRecord = jest.fn();

    const mockPrismaService = {
      projectMember: {
        findMany: mockPrismaFindMany,
        findFirst: mockPrismaMemberFindFirst,
        create: mockPrismaCreate,
      },
      user: {
        findFirst: mockPrismaUserFindFirst,
      },
    };

    const mockMembershipService = {
      verifyProjectExists: mockMembershipVerifyProjectExists,
      isProjectMember: mockMembershipIsProjectMember,
    };

    const mockAuditService = {
      record: mockAuditRecord,
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectMembersService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: MembershipService,
          useValue: mockMembershipService,
        },
        {
          provide: AuditService,
          useValue: mockAuditService,
        },
      ],
    }).compile();

    service = module.get<ProjectMembersService>(ProjectMembersService);
  });

  describe('listMembers', () => {
    it('should allow project member to list members', async () => {
      mockMembershipVerifyProjectExists.mockResolvedValue(true);
      mockMembershipIsProjectMember.mockResolvedValue(true);
      mockPrismaFindMany.mockResolvedValue([
        {
          id: 'member-1',
          userId: 'user-1',
          projectRole: 'OWNER',
          user: {
            id: 'user-1',
            fullName: 'John Owner',
            email: 'john@example.com',
          },
        },
        {
          id: 'member-2',
          userId: 'user-2',
          projectRole: 'MEMBER',
          user: {
            id: 'user-2',
            fullName: 'Jane Member',
            email: 'jane@example.com',
          },
        },
      ]);

      const result = await service.listMembers(memberUser, projectId);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 'member-1',
        user_id: 'user-1',
        full_name: 'John Owner',
        email: 'john@example.com',
        project_role: 'OWNER',
      });

      expect(mockMembershipVerifyProjectExists).toHaveBeenCalledWith({
        projectId,
        companyId: 'company-1',
      });

      expect(mockMembershipIsProjectMember).toHaveBeenCalledWith({
        userId: 'user-2',
        companyId: 'company-1',
        projectId,
      });
    });

    it('should deny non-member from listing members', async () => {
      mockMembershipVerifyProjectExists.mockResolvedValue(true);
      mockMembershipIsProjectMember.mockResolvedValue(false);

      await expect(
        service.listMembers(memberUser, projectId),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.listMembers(memberUser, projectId),
      ).rejects.toThrow('Not a project member');
    });

    it('should throw NotFoundException if project does not exist', async () => {
      mockMembershipVerifyProjectExists.mockResolvedValue(false);

      await expect(
        service.listMembers(memberUser, projectId),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.listMembers(memberUser, projectId),
      ).rejects.toThrow('Project not found');
    });

    it('should scope query by companyId', async () => {
      mockMembershipVerifyProjectExists.mockResolvedValue(true);
      mockMembershipIsProjectMember.mockResolvedValue(true);
      mockPrismaFindMany.mockResolvedValue([]);

      await service.listMembers(memberUser, projectId);

      expect(mockPrismaFindMany).toHaveBeenCalledWith({
        where: {
          projectId,
          companyId: 'company-1',
        },
        include: expect.any(Object),
        orderBy: [{ projectRole: 'asc' }, { user: { fullName: 'asc' } }],
      });
    });
  });

  describe('addMember', () => {
    const dto = {
      user_id: 'user-3',
      project_role: ProjectRole.MEMBER,
    };

    it('should allow OWNER to add member', async () => {
      mockMembershipVerifyProjectExists.mockResolvedValue(true);
      mockPrismaUserFindFirst.mockResolvedValue({
        id: 'user-3',
        companyId: 'company-1',
        fullName: 'New Member',
        email: 'new@example.com',
      });
      mockPrismaMemberFindFirst.mockResolvedValue(null);

      mockPrismaCreate.mockResolvedValue({
        id: 'member-3',
        userId: 'user-3',
        projectRole: 'MEMBER',
        user: {
          id: 'user-3',
          fullName: 'New Member',
          email: 'new@example.com',
        },
      });

      const result = await service.addMember(ownerUser, projectId, dto);

      expect(result).toEqual({
        id: 'member-3',
        user_id: 'user-3',
        full_name: 'New Member',
        email: 'new@example.com',
        project_role: 'MEMBER',
      });

      expect(mockAuditRecord).toHaveBeenCalledWith({
        companyId: 'company-1',
        actorUserId: 'user-1',
        projectId,
        entityType: 'PROJECT_MEMBER',
        entityId: 'member-3',
        action: 'ADDED',
        metadata: {
          userId: 'user-3',
          projectRole: ProjectRole.MEMBER,
        },
      });
    });

    it('should deny MEMBER from adding members', async () => {
      await expect(
        service.addMember(memberUser, projectId, dto),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.addMember(memberUser, projectId, dto),
      ).rejects.toThrow('Only OWNER can manage project members');
    });

    it('should throw NotFoundException if project does not exist', async () => {
      mockMembershipVerifyProjectExists.mockResolvedValue(false);

      await expect(
        service.addMember(ownerUser, projectId, dto),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.addMember(ownerUser, projectId, dto),
      ).rejects.toThrow('Project not found');
    });

    it('should throw NotFoundException if user does not exist', async () => {
      mockMembershipVerifyProjectExists.mockResolvedValue(true);
      mockPrismaUserFindFirst.mockResolvedValue(null);

      await expect(
        service.addMember(ownerUser, projectId, dto),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.addMember(ownerUser, projectId, dto),
      ).rejects.toThrow('User not found');
    });

    it('should throw NotFoundException if user is from different company', async () => {
      mockMembershipVerifyProjectExists.mockResolvedValue(true);
      mockPrismaUserFindFirst.mockResolvedValue(null);

      await expect(
        service.addMember(ownerUser, projectId, dto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should return existing member if user is already a member (idempotent)', async () => {
      mockMembershipVerifyProjectExists.mockResolvedValue(true);
      mockPrismaUserFindFirst.mockResolvedValue({
        id: 'user-3',
        companyId: 'company-1',
      });
      mockPrismaMemberFindFirst.mockResolvedValue({
        id: 'existing-member',
        userId: 'user-3',
        projectRole: 'MEMBER',
        user: {
          id: 'user-3',
          fullName: 'Existing Member',
          email: 'existing@example.com',
        },
      });

      const result = await service.addMember(ownerUser, projectId, dto);

      expect(result).toEqual({
        id: 'existing-member',
        user_id: 'user-3',
        full_name: 'Existing Member',
        email: 'existing@example.com',
        project_role: 'MEMBER',
      });

      expect(mockPrismaCreate).not.toHaveBeenCalled();
      expect(mockAuditRecord).not.toHaveBeenCalled();
    });

    it('should scope user lookup by companyId', async () => {
      mockMembershipVerifyProjectExists.mockResolvedValue(true);
      mockPrismaUserFindFirst.mockResolvedValue(null);

      await expect(
        service.addMember(ownerUser, projectId, dto),
      ).rejects.toThrow(NotFoundException);

      expect(mockPrismaUserFindFirst).toHaveBeenCalledWith({
        where: {
          id: 'user-3',
          companyId: 'company-1',
          deletedAt: null,
        },
      });
    });

    it('should create membership with correct data', async () => {
      mockMembershipVerifyProjectExists.mockResolvedValue(true);
      mockPrismaUserFindFirst.mockResolvedValue({
        id: 'user-3',
        companyId: 'company-1',
      });
      mockPrismaMemberFindFirst.mockResolvedValue(null);

      mockPrismaCreate.mockResolvedValue({
        id: 'member-3',
        userId: 'user-3',
        projectRole: 'MEMBER',
        user: {
          id: 'user-3',
          fullName: 'New Member',
          email: 'new@example.com',
        },
      });

      await service.addMember(ownerUser, projectId, dto);

      expect(mockPrismaCreate).toHaveBeenCalledWith({
        data: {
          companyId: 'company-1',
          projectId,
          userId: 'user-3',
          projectRole: ProjectRole.MEMBER,
        },
        include: expect.any(Object),
      });
    });
  });
});
