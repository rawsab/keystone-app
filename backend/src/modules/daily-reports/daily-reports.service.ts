import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../infra/db/prisma.service';
import { AuditService } from '../audit/audit.service';
import { MembershipService } from '../../security/rbac/membership.service';
import { PolicyUser, DailyReportStatus } from '../../security/rbac';
import { DailyReportListItemDto } from './dto/daily-report-list-item.dto';
import { CreateDailyReportDto } from './dto/create-daily-report.dto';
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

  private mapToResponseDto(report: any): DailyReportResponseDto {
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
      attachments: report.attachments.map((attachment: any) => ({
        id: attachment.fileObject.id,
        original_filename: attachment.fileObject.originalFilename,
        mime_type: attachment.fileObject.mimeType,
        size_bytes: Number(attachment.fileObject.sizeBytes),
      })),
    };
  }

  private formatDateAsYYYYMMDD(date: Date): string {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
