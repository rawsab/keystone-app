import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../infra/db/prisma.service';
import { AuditService } from '../audit/audit.service';
import { MembershipService } from '../../security/rbac/membership.service';
import { PolicyUser, DailyReportStatus } from '../../security/rbac';
import { DailyReportListItemDto } from './dto/daily-report-list-item.dto';
import { CreateDailyReportDto } from './dto/create-daily-report.dto';
import { UpdateDailyReportDto } from './dto/update-daily-report.dto';
import { DailyReportResponseDto } from './dto/daily-report-response.dto';

@Injectable()
export class DailyReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly membershipService: MembershipService,
  ) {}

  async listForProject(
    user: PolicyUser,
    projectId: string,
    fromDate?: string,
    toDate?: string,
  ): Promise<DailyReportListItemDto[]> {
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

    const whereClause: any = {
      projectId,
      companyId: user.companyId,
      deletedAt: null,
    };

    if (fromDate || toDate) {
      whereClause.reportDate = {};
      if (fromDate) {
        whereClause.reportDate.gte = new Date(fromDate);
      }
      if (toDate) {
        whereClause.reportDate.lte = new Date(toDate);
      }
    }

    const reports = await this.prisma.dailyReport.findMany({
      where: whereClause,
      include: {
        createdBy: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
      orderBy: {
        reportDate: 'desc',
      },
    });

    return reports.map((report) => ({
      id: report.id,
      report_date: this.formatDateAsYYYYMMDD(report.reportDate),
      status: report.status,
      created_by: {
        id: report.createdBy.id,
        full_name: report.createdBy.fullName,
      },
      updated_at: report.updatedAt.toISOString(),
    }));
  }

  async createOrGetDraftForDate(
    user: PolicyUser,
    projectId: string,
    dto: CreateDailyReportDto,
  ): Promise<DailyReportResponseDto> {
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

    const reportDate = new Date(dto.report_date);

    const existingReport = await this.prisma.dailyReport.findFirst({
      where: {
        companyId: user.companyId,
        projectId,
        reportDate,
        deletedAt: null,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            fullName: true,
          },
        },
        attachments: {
          include: {
            fileObject: {
              select: {
                id: true,
                originalFilename: true,
                mimeType: true,
                sizeBytes: true,
              },
            },
          },
        },
      },
    });

    if (existingReport) {
      return this.mapToResponseDto(existingReport);
    }

    try {
      const newReport = await this.prisma.dailyReport.create({
        data: {
          companyId: user.companyId,
          projectId,
          reportDate,
          status: DailyReportStatus.DRAFT,
          createdByUserId: user.userId,
          workCompletedText: '',
        },
        include: {
          createdBy: {
            select: {
              id: true,
              fullName: true,
            },
          },
          attachments: {
            include: {
              fileObject: {
                select: {
                  id: true,
                  originalFilename: true,
                  mimeType: true,
                  sizeBytes: true,
                },
              },
            },
          },
        },
      });

      await this.auditService.record({
        companyId: user.companyId,
        actorUserId: user.userId,
        projectId,
        entityType: 'DAILY_REPORT',
        entityId: newReport.id,
        action: 'CREATED',
        metadata: {
          projectId,
          reportDate: dto.report_date,
        },
      });

      return this.mapToResponseDto(newReport);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const conflictReport = await this.prisma.dailyReport.findFirst({
          where: {
            companyId: user.companyId,
            projectId,
            reportDate,
            deletedAt: null,
          },
          include: {
            createdBy: {
              select: {
                id: true,
                fullName: true,
              },
            },
            attachments: {
              include: {
                fileObject: {
                  select: {
                    id: true,
                    originalFilename: true,
                    mimeType: true,
                    sizeBytes: true,
                  },
                },
              },
            },
          },
        });

        if (conflictReport) {
          return this.mapToResponseDto(conflictReport);
        }
      }

      throw error;
    }
  }

  private mapToResponseDto(report: {
    id: string;
    projectId: string;
    reportDate: Date;
    status: string;
    workCompletedText: string;
    issuesDelaysText: string | null;
    notesText: string | null;
    weatherObserved: any;
    hoursWorkedTotal: any;
    submittedAt: Date | null;
    updatedAt: Date;
    createdBy: {
      id: string;
      fullName: string;
    };
    attachments: Array<{
      fileObject: {
        id: string;
        originalFilename: string;
        mimeType: string;
        sizeBytes: bigint;
      };
    }>;
  }): DailyReportResponseDto {
    return {
      id: report.id,
      project_id: report.projectId,
      report_date: this.formatDateAsYYYYMMDD(report.reportDate),
      status: report.status,
      work_completed_text: report.workCompletedText,
      issues_delays_text: report.issuesDelaysText,
      notes_text: report.notesText,
      weather_observed: report.weatherObserved,
      hours_worked_total: report.hoursWorkedTotal ? Number(report.hoursWorkedTotal) : null,
      created_by: {
        id: report.createdBy.id,
        full_name: report.createdBy.fullName,
      },
      submitted_at: report.submittedAt ? report.submittedAt.toISOString() : null,
      updated_at: report.updatedAt.toISOString(),
      attachments: report.attachments.map((attachment) => ({
        id: attachment.fileObject.id,
        original_filename: attachment.fileObject.originalFilename,
        mime_type: attachment.fileObject.mimeType,
        size_bytes: Number(attachment.fileObject.sizeBytes),
      })),
    };
  }

  async getById(user: PolicyUser, reportId: string): Promise<DailyReportResponseDto> {
    const report = await this.prisma.dailyReport.findFirst({
      where: {
        id: reportId,
        companyId: user.companyId,
        deletedAt: null,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            fullName: true,
          },
        },
        attachments: {
          where: {
            fileObject: {
              companyId: user.companyId,
              deletedAt: null,
            },
          },
          include: {
            fileObject: {
              select: {
                id: true,
                originalFilename: true,
                mimeType: true,
                sizeBytes: true,
              },
            },
          },
        },
      },
    });

    if (!report) {
      throw new NotFoundException('Daily report not found');
    }

    const isMember = await this.membershipService.isProjectMember({
      userId: user.userId,
      companyId: user.companyId,
      projectId: report.projectId,
    });

    if (!isMember) {
      throw new ForbiddenException('Not a project member');
    }

    return this.mapToResponseDto(report);
  }

  async updateDraft(
    user: PolicyUser,
    reportId: string,
    dto: UpdateDailyReportDto,
  ): Promise<DailyReportResponseDto> {
    const report = await this.prisma.dailyReport.findFirst({
      where: {
        id: reportId,
        companyId: user.companyId,
        deletedAt: null,
      },
    });

    if (!report) {
      throw new NotFoundException('Daily report not found');
    }

    const isMember = await this.membershipService.isProjectMember({
      userId: user.userId,
      companyId: user.companyId,
      projectId: report.projectId,
    });

    if (!isMember) {
      throw new ForbiddenException('Not a project member');
    }

    if (report.status !== DailyReportStatus.DRAFT) {
      throw new ConflictException('Cannot edit submitted report');
    }

    const updateData: any = {};

    if (dto.work_completed_text !== undefined) {
      updateData.workCompletedText = dto.work_completed_text;
    }
    if (dto.issues_delays_text !== undefined) {
      updateData.issuesDelaysText = dto.issues_delays_text;
    }
    if (dto.notes_text !== undefined) {
      updateData.notesText = dto.notes_text;
    }
    if (dto.weather_observed !== undefined) {
      updateData.weatherObserved = dto.weather_observed;
    }
    if (dto.hours_worked_total !== undefined) {
      updateData.hoursWorkedTotal = dto.hours_worked_total;
    }

    const updatedReport = await this.prisma.dailyReport.update({
      where: {
        id: reportId,
        companyId: user.companyId,
        deletedAt: null,
      },
      data: updateData,
      include: {
        createdBy: {
          select: {
            id: true,
            fullName: true,
          },
        },
        attachments: {
          where: {
            fileObject: {
              companyId: user.companyId,
              deletedAt: null,
            },
          },
          include: {
            fileObject: {
              select: {
                id: true,
                originalFilename: true,
                mimeType: true,
                sizeBytes: true,
              },
            },
          },
        },
      },
    });

    return this.mapToResponseDto(updatedReport);
  }

  async submitReport(user: PolicyUser, reportId: string): Promise<DailyReportResponseDto> {
    const report = await this.prisma.dailyReport.findFirst({
      where: {
        id: reportId,
        companyId: user.companyId,
        deletedAt: null,
      },
    });

    if (!report) {
      throw new NotFoundException('Daily report not found');
    }

    const isMember = await this.membershipService.isProjectMember({
      userId: user.userId,
      companyId: user.companyId,
      projectId: report.projectId,
    });

    if (!isMember) {
      throw new ForbiddenException('Not a project member');
    }

    if (report.status !== DailyReportStatus.DRAFT) {
      throw new ConflictException('Report is already submitted');
    }

    const trimmedWorkCompleted = report.workCompletedText.trim();
    if (!trimmedWorkCompleted) {
      throw new BadRequestException('work_completed_text must be non-empty to submit');
    }

    const submittedReport = await this.prisma.dailyReport.update({
      where: {
        id: reportId,
        companyId: user.companyId,
        deletedAt: null,
      },
      data: {
        status: DailyReportStatus.SUBMITTED,
        submittedAt: new Date(),
      },
      include: {
        createdBy: {
          select: {
            id: true,
            fullName: true,
          },
        },
        attachments: {
          where: {
            fileObject: {
              companyId: user.companyId,
              deletedAt: null,
            },
          },
          include: {
            fileObject: {
              select: {
                id: true,
                originalFilename: true,
                mimeType: true,
                sizeBytes: true,
              },
            },
          },
        },
      },
    });

    await this.auditService.record({
      companyId: user.companyId,
      actorUserId: user.userId,
      projectId: report.projectId,
      entityType: 'DAILY_REPORT',
      entityId: reportId,
      action: 'SUBMITTED',
      metadata: {
        projectId: report.projectId,
        reportId,
        reportDate: this.formatDateAsYYYYMMDD(report.reportDate),
      },
    });

    return this.mapToResponseDto(submittedReport);
  }

  private formatDateAsYYYYMMDD(date: Date): string {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
