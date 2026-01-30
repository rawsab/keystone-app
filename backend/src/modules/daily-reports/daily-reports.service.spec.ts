import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { DailyReportsService } from './daily-reports.service';
import { PrismaService } from '../../infra/db/prisma.service';
import { MembershipService } from '../../security/rbac/membership.service';
import { UserRole } from '../../security/rbac';

describe('DailyReportsService', () => {
  let service: DailyReportsService;
  let mockPrismaFindMany: jest.Mock;
  let mockMembershipVerifyProjectExists: jest.Mock;
  let mockMembershipIsProjectMember: jest.Mock;

  const memberUser = {
    userId: 'user-1',
    companyId: 'company-1',
    role: UserRole.MEMBER,
  };

  const projectId = 'project-1';

  beforeEach(async () => {
    mockPrismaFindMany = jest.fn();
    mockMembershipVerifyProjectExists = jest.fn();
    mockMembershipIsProjectMember = jest.fn();

    const mockPrismaService = {
      dailyReport: {
        findMany: mockPrismaFindMany,
      },
    };

    const mockMembershipService = {
      verifyProjectExists: mockMembershipVerifyProjectExists,
      isProjectMember: mockMembershipIsProjectMember,
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DailyReportsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: MembershipService,
          useValue: mockMembershipService,
        },
      ],
    }).compile();

    service = module.get<DailyReportsService>(DailyReportsService);
  });

  describe('listForProject', () => {
    it('should allow project member to list daily reports', async () => {
      mockMembershipVerifyProjectExists.mockResolvedValue(true);
      mockMembershipIsProjectMember.mockResolvedValue(true);
      mockPrismaFindMany.mockResolvedValue([
        {
          id: 'report-1',
          reportDate: new Date('2026-01-29'),
          status: 'SUBMITTED',
          updatedAt: new Date('2026-01-29T16:00:00Z'),
          createdBy: {
            id: 'user-1',
            fullName: 'John Doe',
          },
        },
        {
          id: 'report-2',
          reportDate: new Date('2026-01-28'),
          status: 'DRAFT',
          updatedAt: new Date('2026-01-28T15:00:00Z'),
          createdBy: {
            id: 'user-2',
            fullName: 'Jane Smith',
          },
        },
      ]);

      const result = await service.listForProject(memberUser, projectId);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 'report-1',
        report_date: '2026-01-29',
        status: 'SUBMITTED',
        created_by: {
          id: 'user-1',
          full_name: 'John Doe',
        },
        updated_at: '2026-01-29T16:00:00.000Z',
      });

      expect(mockMembershipVerifyProjectExists).toHaveBeenCalledWith({
        projectId,
        companyId: 'company-1',
      });

      expect(mockMembershipIsProjectMember).toHaveBeenCalledWith({
        userId: 'user-1',
        companyId: 'company-1',
        projectId,
      });

      expect(mockPrismaFindMany).toHaveBeenCalledWith({
        where: {
          projectId,
          companyId: 'company-1',
          deletedAt: null,
        },
        include: expect.any(Object),
        orderBy: {
          reportDate: 'desc',
        },
      });
    });

    it('should deny non-member from listing daily reports', async () => {
      mockMembershipVerifyProjectExists.mockResolvedValue(true);
      mockMembershipIsProjectMember.mockResolvedValue(false);

      await expect(service.listForProject(memberUser, projectId)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.listForProject(memberUser, projectId)).rejects.toThrow(
        'Not a project member',
      );
    });

    it('should throw NotFoundException if project does not exist', async () => {
      mockMembershipVerifyProjectExists.mockResolvedValue(false);

      await expect(service.listForProject(memberUser, projectId)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.listForProject(memberUser, projectId)).rejects.toThrow(
        'Project not found',
      );
    });

    it('should filter by from_date when provided', async () => {
      mockMembershipVerifyProjectExists.mockResolvedValue(true);
      mockMembershipIsProjectMember.mockResolvedValue(true);
      mockPrismaFindMany.mockResolvedValue([]);

      await service.listForProject(memberUser, projectId, '2026-01-15', undefined);

      expect(mockPrismaFindMany).toHaveBeenCalledWith({
        where: {
          projectId,
          companyId: 'company-1',
          deletedAt: null,
          reportDate: {
            gte: new Date('2026-01-15'),
          },
        },
        include: expect.any(Object),
        orderBy: {
          reportDate: 'desc',
        },
      });
    });

    it('should filter by to_date when provided', async () => {
      mockMembershipVerifyProjectExists.mockResolvedValue(true);
      mockMembershipIsProjectMember.mockResolvedValue(true);
      mockPrismaFindMany.mockResolvedValue([]);

      await service.listForProject(memberUser, projectId, undefined, '2026-01-31');

      expect(mockPrismaFindMany).toHaveBeenCalledWith({
        where: {
          projectId,
          companyId: 'company-1',
          deletedAt: null,
          reportDate: {
            lte: new Date('2026-01-31'),
          },
        },
        include: expect.any(Object),
        orderBy: {
          reportDate: 'desc',
        },
      });
    });

    it('should filter by date range when both from_date and to_date provided', async () => {
      mockMembershipVerifyProjectExists.mockResolvedValue(true);
      mockMembershipIsProjectMember.mockResolvedValue(true);
      mockPrismaFindMany.mockResolvedValue([]);

      await service.listForProject(memberUser, projectId, '2026-01-15', '2026-01-31');

      expect(mockPrismaFindMany).toHaveBeenCalledWith({
        where: {
          projectId,
          companyId: 'company-1',
          deletedAt: null,
          reportDate: {
            gte: new Date('2026-01-15'),
            lte: new Date('2026-01-31'),
          },
        },
        include: expect.any(Object),
        orderBy: {
          reportDate: 'desc',
        },
      });
    });

    it('should scope query by companyId and exclude deleted reports', async () => {
      mockMembershipVerifyProjectExists.mockResolvedValue(true);
      mockMembershipIsProjectMember.mockResolvedValue(true);
      mockPrismaFindMany.mockResolvedValue([]);

      await service.listForProject(memberUser, projectId);

      expect(mockPrismaFindMany).toHaveBeenCalledWith({
        where: {
          projectId,
          companyId: 'company-1',
          deletedAt: null,
        },
        include: expect.any(Object),
        orderBy: {
          reportDate: 'desc',
        },
      });
    });

    it('should order by report_date descending (newest first)', async () => {
      mockMembershipVerifyProjectExists.mockResolvedValue(true);
      mockMembershipIsProjectMember.mockResolvedValue(true);
      mockPrismaFindMany.mockResolvedValue([]);

      await service.listForProject(memberUser, projectId);

      expect(mockPrismaFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: {
            reportDate: 'desc',
          },
        }),
      );
    });
  });
});
