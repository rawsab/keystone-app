import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { DailyReportsService } from './daily-reports.service';
import { PrismaService } from '../../infra/db/prisma.service';
import { AuditService } from '../audit/audit.service';
import { MembershipService } from '../../security/rbac/membership.service';
import { UserRole, DailyReportStatus } from '../../security/rbac';

describe('DailyReportsService', () => {
  let service: DailyReportsService;
  let mockPrismaFindMany: jest.Mock;
  let mockPrismaFindFirst: jest.Mock;
  let mockPrismaCreate: jest.Mock;
  let mockMembershipVerifyProjectExists: jest.Mock;
  let mockMembershipIsProjectMember: jest.Mock;
  let mockAuditRecord: jest.Mock;

  const memberUser = {
    userId: 'user-1',
    companyId: 'company-1',
    role: UserRole.MEMBER,
  };

  const projectId = 'project-1';

  beforeEach(async () => {
    mockPrismaFindMany = jest.fn();
    mockPrismaFindFirst = jest.fn();
    mockPrismaCreate = jest.fn();
    mockMembershipVerifyProjectExists = jest.fn();
    mockMembershipIsProjectMember = jest.fn();
    mockAuditRecord = jest.fn();

    const mockPrismaService = {
      dailyReport: {
        findMany: mockPrismaFindMany,
        findFirst: mockPrismaFindFirst,
        create: mockPrismaCreate,
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
        DailyReportsService,
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

  describe('createOrGetDraftForDate', () => {
    const dto = {
      report_date: '2026-01-29',
    };

    const mockReport = {
      id: 'report-1',
      projectId: 'project-1',
      reportDate: new Date('2026-01-29'),
      status: DailyReportStatus.DRAFT,
      workCompletedText: '',
      issuesDelaysText: null,
      notesText: null,
      weatherObserved: null,
      hoursWorkedTotal: null,
      submittedAt: null,
      updatedAt: new Date('2026-01-29T15:00:00Z'),
      createdBy: {
        id: 'user-1',
        fullName: 'John Doe',
      },
      attachments: [],
    };

    it('should allow project member to create new draft', async () => {
      mockMembershipVerifyProjectExists.mockResolvedValue(true);
      mockMembershipIsProjectMember.mockResolvedValue(true);
      mockPrismaFindFirst.mockResolvedValue(null);
      mockPrismaCreate.mockResolvedValue(mockReport);

      const result = await service.createOrGetDraftForDate(memberUser, projectId, dto);

      expect(result).toEqual({
        id: 'report-1',
        project_id: 'project-1',
        report_date: '2026-01-29',
        status: DailyReportStatus.DRAFT,
        work_completed_text: '',
        issues_delays_text: null,
        notes_text: null,
        weather_observed: null,
        hours_worked_total: null,
        created_by: {
          id: 'user-1',
          full_name: 'John Doe',
        },
        submitted_at: null,
        updated_at: '2026-01-29T15:00:00.000Z',
        attachments: [],
      });

      expect(mockPrismaCreate).toHaveBeenCalledWith({
        data: {
          companyId: 'company-1',
          projectId,
          reportDate: new Date('2026-01-29'),
          status: DailyReportStatus.DRAFT,
          createdByUserId: 'user-1',
          workCompletedText: '',
        },
        include: expect.any(Object),
      });

      expect(mockAuditRecord).toHaveBeenCalledWith({
        companyId: 'company-1',
        actorUserId: 'user-1',
        projectId,
        entityType: 'DAILY_REPORT',
        entityId: 'report-1',
        action: 'CREATED',
        metadata: {
          projectId,
          reportDate: '2026-01-29',
        },
      });
    });

    it('should return existing draft if already exists (idempotent)', async () => {
      mockMembershipVerifyProjectExists.mockResolvedValue(true);
      mockMembershipIsProjectMember.mockResolvedValue(true);
      mockPrismaFindFirst.mockResolvedValue(mockReport);

      const result = await service.createOrGetDraftForDate(memberUser, projectId, dto);

      expect(result.id).toBe('report-1');
      expect(result.report_date).toBe('2026-01-29');
      expect(mockPrismaCreate).not.toHaveBeenCalled();
      expect(mockAuditRecord).not.toHaveBeenCalled();
    });

    it('should deny non-member from creating draft', async () => {
      mockMembershipVerifyProjectExists.mockResolvedValue(true);
      mockMembershipIsProjectMember.mockResolvedValue(false);

      await expect(service.createOrGetDraftForDate(memberUser, projectId, dto)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.createOrGetDraftForDate(memberUser, projectId, dto)).rejects.toThrow(
        'Not a project member',
      );
    });

    it('should throw NotFoundException if project does not exist', async () => {
      mockMembershipVerifyProjectExists.mockResolvedValue(false);

      await expect(service.createOrGetDraftForDate(memberUser, projectId, dto)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.createOrGetDraftForDate(memberUser, projectId, dto)).rejects.toThrow(
        'Project not found',
      );
    });

    it('should handle unique constraint conflict (concurrency-safe)', async () => {
      mockMembershipVerifyProjectExists.mockResolvedValue(true);
      mockMembershipIsProjectMember.mockResolvedValue(true);
      mockPrismaFindFirst.mockResolvedValueOnce(null).mockResolvedValueOnce(mockReport);

      const uniqueConstraintError = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed',
        {
          code: 'P2002',
          clientVersion: '7.3.0',
        },
      );

      mockPrismaCreate.mockRejectedValue(uniqueConstraintError);

      const result = await service.createOrGetDraftForDate(memberUser, projectId, dto);

      expect(result.id).toBe('report-1');
      expect(mockPrismaFindFirst).toHaveBeenCalledTimes(2);
      expect(mockAuditRecord).not.toHaveBeenCalled();
    });

    it('should scope query by companyId and exclude deleted reports', async () => {
      mockMembershipVerifyProjectExists.mockResolvedValue(true);
      mockMembershipIsProjectMember.mockResolvedValue(true);
      mockPrismaFindFirst.mockResolvedValue(null);
      mockPrismaCreate.mockResolvedValue(mockReport);

      await service.createOrGetDraftForDate(memberUser, projectId, dto);

      expect(mockPrismaFindFirst).toHaveBeenCalledWith({
        where: {
          companyId: 'company-1',
          projectId,
          reportDate: new Date('2026-01-29'),
          deletedAt: null,
        },
        include: expect.any(Object),
      });
    });
  });
});
