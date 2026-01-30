import { Test, TestingModule } from '@nestjs/testing';
import {
  ForbiddenException,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
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
  let mockPrismaUpdate: jest.Mock;
  let mockPrismaFileObjectFindFirst: jest.Mock;
  let mockPrismaAttachmentFindFirst: jest.Mock;
  let mockPrismaAttachmentCreate: jest.Mock;
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
    mockPrismaUpdate = jest.fn();
    mockPrismaFileObjectFindFirst = jest.fn();
    mockPrismaAttachmentFindFirst = jest.fn();
    mockPrismaAttachmentCreate = jest.fn();
    mockMembershipVerifyProjectExists = jest.fn();
    mockMembershipIsProjectMember = jest.fn();
    mockAuditRecord = jest.fn();

    const mockPrismaService = {
      dailyReport: {
        findMany: mockPrismaFindMany,
        findFirst: mockPrismaFindFirst,
        create: mockPrismaCreate,
        update: mockPrismaUpdate,
      },
      fileObject: {
        findFirst: mockPrismaFileObjectFindFirst,
      },
      dailyReportAttachment: {
        findFirst: mockPrismaAttachmentFindFirst,
        create: mockPrismaAttachmentCreate,
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

  describe('getById', () => {
    const reportId = 'report-1';

    const mockReportWithAttachments = {
      id: 'report-1',
      projectId: 'project-1',
      reportDate: new Date('2026-01-29'),
      status: DailyReportStatus.DRAFT,
      workCompletedText: 'Completed framing',
      issuesDelaysText: null,
      notesText: null,
      weatherObserved: { condition: 'CLEAR', temperature_c: 15 },
      hoursWorkedTotal: 8,
      submittedAt: null,
      updatedAt: new Date('2026-01-29T15:00:00Z'),
      createdBy: {
        id: 'user-1',
        fullName: 'John Doe',
      },
      attachments: [
        {
          fileObject: {
            id: 'file-1',
            originalFilename: 'photo.jpg',
            mimeType: 'image/jpeg',
            sizeBytes: BigInt(123456),
          },
        },
      ],
    };

    it('should allow project member to get report', async () => {
      mockPrismaFindFirst.mockResolvedValue(mockReportWithAttachments);
      mockMembershipIsProjectMember.mockResolvedValue(true);

      const result = await service.getById(memberUser, reportId);

      expect(result).toEqual({
        id: 'report-1',
        project_id: 'project-1',
        report_date: '2026-01-29',
        status: DailyReportStatus.DRAFT,
        work_completed_text: 'Completed framing',
        issues_delays_text: null,
        notes_text: null,
        weather_observed: { condition: 'CLEAR', temperature_c: 15 },
        hours_worked_total: 8,
        created_by: {
          id: 'user-1',
          full_name: 'John Doe',
        },
        submitted_at: null,
        updated_at: '2026-01-29T15:00:00.000Z',
        attachments: [
          {
            id: 'file-1',
            original_filename: 'photo.jpg',
            mime_type: 'image/jpeg',
            size_bytes: 123456,
          },
        ],
      });
    });

    it('should deny non-member from getting report', async () => {
      mockPrismaFindFirst.mockResolvedValue(mockReportWithAttachments);
      mockMembershipIsProjectMember.mockResolvedValue(false);

      await expect(service.getById(memberUser, reportId)).rejects.toThrow(ForbiddenException);
      await expect(service.getById(memberUser, reportId)).rejects.toThrow('Not a project member');
    });

    it('should throw NotFoundException if report does not exist', async () => {
      mockPrismaFindFirst.mockResolvedValue(null);

      await expect(service.getById(memberUser, reportId)).rejects.toThrow(NotFoundException);
      await expect(service.getById(memberUser, reportId)).rejects.toThrow('Daily report not found');
    });

    it('should scope query by companyId and exclude deleted reports', async () => {
      mockPrismaFindFirst.mockResolvedValue(mockReportWithAttachments);
      mockMembershipIsProjectMember.mockResolvedValue(true);

      await service.getById(memberUser, reportId);

      expect(mockPrismaFindFirst).toHaveBeenCalledWith({
        where: {
          id: reportId,
          companyId: 'company-1',
          deletedAt: null,
        },
        include: expect.objectContaining({
          attachments: expect.objectContaining({
            where: {
              fileObject: {
                companyId: 'company-1',
                deletedAt: null,
              },
            },
          }),
        }),
      });
    });

    it('should include attachments when they exist', async () => {
      mockPrismaFindFirst.mockResolvedValue(mockReportWithAttachments);
      mockMembershipIsProjectMember.mockResolvedValue(true);

      const result = await service.getById(memberUser, reportId);

      expect(result.attachments).toHaveLength(1);
      expect(result.attachments[0]).toEqual({
        id: 'file-1',
        original_filename: 'photo.jpg',
        mime_type: 'image/jpeg',
        size_bytes: 123456,
      });
    });
  });

  describe('updateDraft', () => {
    const reportId = 'report-1';
    const updateDto = {
      work_completed_text: 'Updated work completed',
      issues_delays_text: 'Some delays',
      hours_worked_total: 9,
    };

    const mockDraftReport = {
      id: 'report-1',
      projectId: 'project-1',
      status: DailyReportStatus.DRAFT,
    };

    const mockSubmittedReport = {
      id: 'report-1',
      projectId: 'project-1',
      status: DailyReportStatus.SUBMITTED,
    };

    const mockUpdatedReport = {
      id: 'report-1',
      projectId: 'project-1',
      reportDate: new Date('2026-01-29'),
      status: DailyReportStatus.DRAFT,
      workCompletedText: 'Updated work completed',
      issuesDelaysText: 'Some delays',
      notesText: null,
      weatherObserved: null,
      hoursWorkedTotal: 9,
      submittedAt: null,
      updatedAt: new Date('2026-01-29T16:00:00Z'),
      createdBy: {
        id: 'user-1',
        fullName: 'John Doe',
      },
      attachments: [],
    };

    it('should allow project member to update draft', async () => {
      mockPrismaFindFirst.mockResolvedValue(mockDraftReport);
      mockMembershipIsProjectMember.mockResolvedValue(true);
      mockPrismaUpdate.mockResolvedValue(mockUpdatedReport);

      const result = await service.updateDraft(memberUser, reportId, updateDto);

      expect(result.work_completed_text).toBe('Updated work completed');
      expect(result.issues_delays_text).toBe('Some delays');
      expect(result.hours_worked_total).toBe(9);

      expect(mockPrismaUpdate).toHaveBeenCalledWith({
        where: {
          id: reportId,
          companyId: 'company-1',
          deletedAt: null,
        },
        data: {
          workCompletedText: 'Updated work completed',
          issuesDelaysText: 'Some delays',
          hoursWorkedTotal: 9,
        },
        include: expect.any(Object),
      });
    });

    it('should deny non-member from updating draft', async () => {
      mockPrismaFindFirst.mockResolvedValue(mockDraftReport);
      mockMembershipIsProjectMember.mockResolvedValue(false);

      await expect(service.updateDraft(memberUser, reportId, updateDto)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.updateDraft(memberUser, reportId, updateDto)).rejects.toThrow(
        'Not a project member',
      );
    });

    it('should throw NotFoundException if report does not exist', async () => {
      mockPrismaFindFirst.mockResolvedValue(null);

      await expect(service.updateDraft(memberUser, reportId, updateDto)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.updateDraft(memberUser, reportId, updateDto)).rejects.toThrow(
        'Daily report not found',
      );
    });

    it('should throw ConflictException when updating submitted report', async () => {
      mockPrismaFindFirst.mockResolvedValue(mockSubmittedReport);
      mockMembershipIsProjectMember.mockResolvedValue(true);

      await expect(service.updateDraft(memberUser, reportId, updateDto)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.updateDraft(memberUser, reportId, updateDto)).rejects.toThrow(
        'Cannot edit submitted report',
      );
    });

    it('should scope query by companyId and exclude deleted reports', async () => {
      mockPrismaFindFirst.mockResolvedValue(mockDraftReport);
      mockMembershipIsProjectMember.mockResolvedValue(true);
      mockPrismaUpdate.mockResolvedValue(mockUpdatedReport);

      await service.updateDraft(memberUser, reportId, updateDto);

      expect(mockPrismaFindFirst).toHaveBeenCalledWith({
        where: {
          id: reportId,
          companyId: 'company-1',
          deletedAt: null,
        },
      });
    });

    it('should not write audit event for draft updates', async () => {
      mockPrismaFindFirst.mockResolvedValue(mockDraftReport);
      mockMembershipIsProjectMember.mockResolvedValue(true);
      mockPrismaUpdate.mockResolvedValue(mockUpdatedReport);

      await service.updateDraft(memberUser, reportId, updateDto);

      expect(mockAuditRecord).not.toHaveBeenCalled();
    });

    it('should handle partial updates (only provided fields)', async () => {
      const partialDto = {
        work_completed_text: 'Only this field',
      };

      mockPrismaFindFirst.mockResolvedValue(mockDraftReport);
      mockMembershipIsProjectMember.mockResolvedValue(true);
      mockPrismaUpdate.mockResolvedValue(mockUpdatedReport);

      await service.updateDraft(memberUser, reportId, partialDto);

      expect(mockPrismaUpdate).toHaveBeenCalledWith({
        where: {
          id: reportId,
          companyId: 'company-1',
          deletedAt: null,
        },
        data: {
          workCompletedText: 'Only this field',
        },
        include: expect.any(Object),
      });
    });
  });

  describe('submitReport', () => {
    const reportId = 'report-1';

    const mockDraftReportWithContent = {
      id: 'report-1',
      projectId: 'project-1',
      reportDate: new Date('2026-01-29'),
      status: DailyReportStatus.DRAFT,
      workCompletedText: 'Completed framing work',
    };

    const mockDraftReportEmpty = {
      id: 'report-1',
      projectId: 'project-1',
      reportDate: new Date('2026-01-29'),
      status: DailyReportStatus.DRAFT,
      workCompletedText: '   ',
    };

    const mockSubmittedReport = {
      id: 'report-1',
      projectId: 'project-1',
      reportDate: new Date('2026-01-29'),
      status: DailyReportStatus.SUBMITTED,
      workCompletedText: 'Completed framing work',
    };

    const mockSubmittedReportFull = {
      id: 'report-1',
      projectId: 'project-1',
      reportDate: new Date('2026-01-29'),
      status: DailyReportStatus.SUBMITTED,
      workCompletedText: 'Completed framing work',
      issuesDelaysText: null,
      notesText: null,
      weatherObserved: null,
      hoursWorkedTotal: 8,
      submittedAt: new Date('2026-01-29T18:00:00Z'),
      updatedAt: new Date('2026-01-29T18:00:00Z'),
      createdBy: {
        id: 'user-1',
        fullName: 'John Doe',
      },
      attachments: [],
    };

    it('should allow project member to submit draft with valid content', async () => {
      mockPrismaFindFirst.mockResolvedValue(mockDraftReportWithContent);
      mockMembershipIsProjectMember.mockResolvedValue(true);
      mockPrismaUpdate.mockResolvedValue(mockSubmittedReportFull);

      const result = await service.submitReport(memberUser, reportId);

      expect(result.status).toBe(DailyReportStatus.SUBMITTED);
      expect(result.submitted_at).toBeTruthy();

      expect(mockPrismaUpdate).toHaveBeenCalledWith({
        where: {
          id: reportId,
          companyId: 'company-1',
          deletedAt: null,
        },
        data: {
          status: DailyReportStatus.SUBMITTED,
          submittedAt: expect.any(Date),
        },
        include: expect.any(Object),
      });

      expect(mockAuditRecord).toHaveBeenCalledWith({
        companyId: 'company-1',
        actorUserId: 'user-1',
        projectId: 'project-1',
        entityType: 'DAILY_REPORT',
        entityId: reportId,
        action: 'SUBMITTED',
        metadata: {
          projectId: 'project-1',
          reportId,
          reportDate: '2026-01-29',
        },
      });
    });

    it('should deny non-member from submitting report', async () => {
      mockPrismaFindFirst.mockResolvedValue(mockDraftReportWithContent);
      mockMembershipIsProjectMember.mockResolvedValue(false);

      await expect(service.submitReport(memberUser, reportId)).rejects.toThrow(ForbiddenException);
      await expect(service.submitReport(memberUser, reportId)).rejects.toThrow(
        'Not a project member',
      );

      expect(mockPrismaUpdate).not.toHaveBeenCalled();
      expect(mockAuditRecord).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if report does not exist', async () => {
      mockPrismaFindFirst.mockResolvedValue(null);

      await expect(service.submitReport(memberUser, reportId)).rejects.toThrow(NotFoundException);
      await expect(service.submitReport(memberUser, reportId)).rejects.toThrow(
        'Daily report not found',
      );
    });

    it('should throw ConflictException when submitting already submitted report', async () => {
      mockPrismaFindFirst.mockResolvedValue(mockSubmittedReport);
      mockMembershipIsProjectMember.mockResolvedValue(true);

      await expect(service.submitReport(memberUser, reportId)).rejects.toThrow(ConflictException);
      await expect(service.submitReport(memberUser, reportId)).rejects.toThrow(
        'Report is already submitted',
      );

      expect(mockPrismaUpdate).not.toHaveBeenCalled();
      expect(mockAuditRecord).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when work_completed_text is empty', async () => {
      mockPrismaFindFirst.mockResolvedValue(mockDraftReportEmpty);
      mockMembershipIsProjectMember.mockResolvedValue(true);

      await expect(service.submitReport(memberUser, reportId)).rejects.toThrow(BadRequestException);
      await expect(service.submitReport(memberUser, reportId)).rejects.toThrow(
        'work_completed_text must be non-empty to submit',
      );

      expect(mockPrismaUpdate).not.toHaveBeenCalled();
      expect(mockAuditRecord).not.toHaveBeenCalled();
    });

    it('should scope query by companyId and exclude deleted reports', async () => {
      mockPrismaFindFirst.mockResolvedValue(mockDraftReportWithContent);
      mockMembershipIsProjectMember.mockResolvedValue(true);
      mockPrismaUpdate.mockResolvedValue(mockSubmittedReportFull);

      await service.submitReport(memberUser, reportId);

      expect(mockPrismaFindFirst).toHaveBeenCalledWith({
        where: {
          id: reportId,
          companyId: 'company-1',
          deletedAt: null,
        },
      });
    });

    it('should write audit event only on successful submit', async () => {
      mockPrismaFindFirst.mockResolvedValue(mockDraftReportWithContent);
      mockMembershipIsProjectMember.mockResolvedValue(true);
      mockPrismaUpdate.mockResolvedValue(mockSubmittedReportFull);

      await service.submitReport(memberUser, reportId);

      expect(mockAuditRecord).toHaveBeenCalledTimes(1);
      expect(mockAuditRecord).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'SUBMITTED',
          entityType: 'DAILY_REPORT',
        }),
      );
    });
  });

  describe('attachFile', () => {
    const reportId = 'report-1';
    const fileObjectId = 'file-1';
    const dto = { file_object_id: fileObjectId };

    const mockReport = {
      id: 'report-1',
      projectId: 'project-1',
    };

    const mockFileObject = {
      id: 'file-1',
      projectId: 'project-1',
    };

    const mockFileObjectDifferentProject = {
      id: 'file-1',
      projectId: 'project-2',
    };

    it('should allow project member to attach file from same project', async () => {
      mockPrismaFindFirst.mockResolvedValue(mockReport);
      mockMembershipIsProjectMember.mockResolvedValue(true);
      mockPrismaFileObjectFindFirst.mockResolvedValue(mockFileObject);
      mockPrismaAttachmentFindFirst.mockResolvedValue(null);

      const result = await service.attachFile(memberUser, reportId, dto);

      expect(result).toEqual({ ok: true });

      expect(mockPrismaAttachmentCreate).toHaveBeenCalledWith({
        data: {
          companyId: 'company-1',
          dailyReportId: reportId,
          fileObjectId: fileObjectId,
        },
      });

      expect(mockAuditRecord).toHaveBeenCalledWith({
        companyId: 'company-1',
        actorUserId: 'user-1',
        projectId: 'project-1',
        entityType: 'DAILY_REPORT',
        entityId: reportId,
        action: 'FILE_ATTACHED',
        metadata: {
          reportId,
          fileObjectId,
        },
      });
    });

    it('should deny non-member from attaching file', async () => {
      mockPrismaFindFirst.mockResolvedValue(mockReport);
      mockMembershipIsProjectMember.mockResolvedValue(false);

      await expect(service.attachFile(memberUser, reportId, dto)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.attachFile(memberUser, reportId, dto)).rejects.toThrow(
        'Not a project member',
      );

      expect(mockPrismaAttachmentCreate).not.toHaveBeenCalled();
      expect(mockAuditRecord).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if report does not exist', async () => {
      mockPrismaFindFirst.mockResolvedValue(null);

      await expect(service.attachFile(memberUser, reportId, dto)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.attachFile(memberUser, reportId, dto)).rejects.toThrow(
        'Daily report not found',
      );
    });

    it('should throw NotFoundException if file does not exist', async () => {
      mockPrismaFindFirst.mockResolvedValue(mockReport);
      mockMembershipIsProjectMember.mockResolvedValue(true);
      mockPrismaFileObjectFindFirst.mockResolvedValue(null);

      await expect(service.attachFile(memberUser, reportId, dto)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.attachFile(memberUser, reportId, dto)).rejects.toThrow('File not found');
    });

    it('should throw ForbiddenException if file is from different project', async () => {
      mockPrismaFindFirst.mockResolvedValue(mockReport);
      mockMembershipIsProjectMember.mockResolvedValue(true);
      mockPrismaFileObjectFindFirst.mockResolvedValue(mockFileObjectDifferentProject);

      await expect(service.attachFile(memberUser, reportId, dto)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.attachFile(memberUser, reportId, dto)).rejects.toThrow(
        'File must belong to the same project as the report',
      );

      expect(mockPrismaAttachmentCreate).not.toHaveBeenCalled();
      expect(mockAuditRecord).not.toHaveBeenCalled();
    });

    it('should be idempotent when attaching same file twice', async () => {
      const existingAttachment = {
        id: 'attachment-1',
        dailyReportId: reportId,
        fileObjectId: fileObjectId,
      };

      mockPrismaFindFirst.mockResolvedValue(mockReport);
      mockMembershipIsProjectMember.mockResolvedValue(true);
      mockPrismaFileObjectFindFirst.mockResolvedValue(mockFileObject);
      mockPrismaAttachmentFindFirst.mockResolvedValue(existingAttachment);

      const result = await service.attachFile(memberUser, reportId, dto);

      expect(result).toEqual({ ok: true });
      expect(mockPrismaAttachmentCreate).not.toHaveBeenCalled();
      expect(mockAuditRecord).not.toHaveBeenCalled();
    });

    it('should scope queries by companyId and exclude deleted', async () => {
      mockPrismaFindFirst.mockResolvedValue(mockReport);
      mockMembershipIsProjectMember.mockResolvedValue(true);
      mockPrismaFileObjectFindFirst.mockResolvedValue(mockFileObject);
      mockPrismaAttachmentFindFirst.mockResolvedValue(null);

      await service.attachFile(memberUser, reportId, dto);

      expect(mockPrismaFindFirst).toHaveBeenCalledWith({
        where: {
          id: reportId,
          companyId: 'company-1',
          deletedAt: null,
        },
      });

      expect(mockPrismaFileObjectFindFirst).toHaveBeenCalledWith({
        where: {
          id: fileObjectId,
          companyId: 'company-1',
          deletedAt: null,
        },
      });

      expect(mockPrismaAttachmentFindFirst).toHaveBeenCalledWith({
        where: {
          companyId: 'company-1',
          dailyReportId: reportId,
          fileObjectId: fileObjectId,
        },
      });
    });

    it('should write audit event only when new attachment is created', async () => {
      mockPrismaFindFirst.mockResolvedValue(mockReport);
      mockMembershipIsProjectMember.mockResolvedValue(true);
      mockPrismaFileObjectFindFirst.mockResolvedValue(mockFileObject);
      mockPrismaAttachmentFindFirst.mockResolvedValue(null);

      await service.attachFile(memberUser, reportId, dto);

      expect(mockAuditRecord).toHaveBeenCalledTimes(1);
      expect(mockAuditRecord).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'FILE_ATTACHED',
          entityType: 'DAILY_REPORT',
        }),
      );
    });

    it('should handle unique constraint conflict (race condition)', async () => {
      mockPrismaFindFirst.mockResolvedValue(mockReport);
      mockMembershipIsProjectMember.mockResolvedValue(true);
      mockPrismaFileObjectFindFirst.mockResolvedValue(mockFileObject);
      mockPrismaAttachmentFindFirst.mockResolvedValue(null);

      const uniqueConstraintError = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed',
        {
          code: 'P2002',
          clientVersion: '7.3.0',
        },
      );

      mockPrismaAttachmentCreate.mockRejectedValue(uniqueConstraintError);

      const result = await service.attachFile(memberUser, reportId, dto);

      expect(result).toEqual({ ok: true });
      expect(mockAuditRecord).not.toHaveBeenCalled();
    });
  });
});
