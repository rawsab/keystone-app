import { Test, TestingModule } from '@nestjs/testing';
import { MembershipService } from './membership.service';
import { PrismaService } from '../../infra/db/prisma.service';

describe('MembershipService', () => {
  let service: MembershipService;
  let mockProjectMemberFindFirst: jest.Mock;
  let mockProjectFindFirst: jest.Mock;

  beforeEach(async () => {
    mockProjectMemberFindFirst = jest.fn();
    mockProjectFindFirst = jest.fn();

    const mockPrismaService = {
      projectMember: {
        findFirst: mockProjectMemberFindFirst,
      },
      project: {
        findFirst: mockProjectFindFirst,
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MembershipService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<MembershipService>(MembershipService);
  });

  describe('isProjectMember', () => {
    it('should return true when membership exists', async () => {
      mockProjectMemberFindFirst.mockResolvedValue({
        id: 'member-1',
        companyId: 'company-1',
        projectId: 'project-1',
        userId: 'user-1',
        projectRole: 'MEMBER',
        createdAt: new Date(),
      });

      const result = await service.isProjectMember({
        userId: 'user-1',
        companyId: 'company-1',
        projectId: 'project-1',
      });

      expect(result).toBe(true);
      expect(mockProjectMemberFindFirst).toHaveBeenCalledWith({
        where: {
          companyId: 'company-1',
          projectId: 'project-1',
          userId: 'user-1',
        },
      });
    });

    it('should return false when membership does not exist', async () => {
      mockProjectMemberFindFirst.mockResolvedValue(null);

      const result = await service.isProjectMember({
        userId: 'user-1',
        companyId: 'company-1',
        projectId: 'project-1',
      });

      expect(result).toBe(false);
    });

    it('should scope query by companyId', async () => {
      mockProjectMemberFindFirst.mockResolvedValue(null);

      await service.isProjectMember({
        userId: 'user-1',
        companyId: 'company-1',
        projectId: 'project-1',
      });

      expect(mockProjectMemberFindFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            companyId: 'company-1',
          }),
        }),
      );
    });
  });

  describe('getProjectRole', () => {
    it('should return project role when membership exists', async () => {
      mockProjectMemberFindFirst.mockResolvedValue({
        projectRole: 'OWNER',
      });

      const result = await service.getProjectRole({
        userId: 'user-1',
        companyId: 'company-1',
        projectId: 'project-1',
      });

      expect(result).toBe('OWNER');
    });

    it('should return null when membership does not exist', async () => {
      mockProjectMemberFindFirst.mockResolvedValue(null);

      const result = await service.getProjectRole({
        userId: 'user-1',
        companyId: 'company-1',
        projectId: 'project-1',
      });

      expect(result).toBeNull();
    });
  });

  describe('verifyProjectExists', () => {
    it('should return true when project exists and is not deleted', async () => {
      mockProjectFindFirst.mockResolvedValue({
        id: 'project-1',
        companyId: 'company-1',
        name: 'Test Project',
        location: null,
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      });

      const result = await service.verifyProjectExists({
        projectId: 'project-1',
        companyId: 'company-1',
      });

      expect(result).toBe(true);
      expect(mockProjectFindFirst).toHaveBeenCalledWith({
        where: {
          id: 'project-1',
          companyId: 'company-1',
          deletedAt: null,
        },
      });
    });

    it('should return false when project does not exist', async () => {
      mockProjectFindFirst.mockResolvedValue(null);

      const result = await service.verifyProjectExists({
        projectId: 'project-1',
        companyId: 'company-1',
      });

      expect(result).toBe(false);
    });

    it('should exclude soft-deleted projects', async () => {
      mockProjectFindFirst.mockResolvedValue(null);

      await service.verifyProjectExists({
        projectId: 'project-1',
        companyId: 'company-1',
      });

      expect(mockProjectFindFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            deletedAt: null,
          }),
        }),
      );
    });
  });
});
