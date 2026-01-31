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
import { WeatherService } from '../weather/weather.service';
import { DailyReportListItemDto } from './dto/daily-report-list-item.dto';
import { CreateDailyReportDto } from './dto/create-daily-report.dto';
import { UpdateDailyReportDto } from './dto/update-daily-report.dto';
import { AttachFileDto } from './dto/attach-file.dto';
import { DailyReportResponseDto } from './dto/daily-report-response.dto';

@Injectable()
export class DailyReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly membershipService: MembershipService,
    private readonly weatherService: WeatherService,
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

      this.fillWeatherSnapshotInBackground(
        newReport.id,
        dto.report_date,
        projectId,
        user.companyId,
      ).catch(() => {});

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
    weatherSnapshot: unknown;
    weatherSnapshotSource: string | null;
    weatherSnapshotTakenAt: Date | null;
    weatherSummaryText: string | null;
    weatherObservedText: string | null;
    weatherObservedFlags: unknown;
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
    const isStub = report.weatherSnapshotSource === 'stub';
    return {
      id: report.id,
      project_id: report.projectId,
      report_date: this.formatDateAsYYYYMMDD(report.reportDate),
      status: report.status,
      work_completed_text: report.workCompletedText,
      issues_delays_text: report.issuesDelaysText,
      notes_text: report.notesText,
      weather_observed: report.weatherObserved,
      weather_snapshot: isStub
        ? null
        : ((report.weatherSnapshot ?? null) as Record<string, unknown> | null),
      weather_snapshot_source: isStub ? null : (report.weatherSnapshotSource ?? null),
      weather_snapshot_taken_at: isStub
        ? null
        : report.weatherSnapshotTakenAt
          ? report.weatherSnapshotTakenAt.toISOString()
          : null,
      weather_summary_text: isStub ? null : (report.weatherSummaryText ?? null),
      weather_observed_text: report.weatherObservedText ?? null,
      weather_observed_flags: (report.weatherObservedFlags ?? null) as Record<
        string,
        unknown
      > | null,
      hours_worked_total: report.hoursWorkedTotal ? Number(report.hoursWorkedTotal) : null,
      weather_refresh_error: null,
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
    if (dto.weather_observed_text !== undefined) {
      updateData.weatherObservedText = dto.weather_observed_text;
    }
    if (dto.weather_observed_flags !== undefined) {
      updateData.weatherObservedFlags = dto.weather_observed_flags;
    }
    if (dto.hours_worked_total !== undefined) {
      updateData.hoursWorkedTotal = dto.hours_worked_total;
    }
    if (dto.clear_weather_snapshot === true) {
      updateData.weatherSnapshot = null;
      updateData.weatherSnapshotSource = null;
      updateData.weatherSnapshotTakenAt = null;
      updateData.weatherSummaryText = null;
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

  async attachFile(
    user: PolicyUser,
    reportId: string,
    dto: AttachFileDto,
  ): Promise<{ ok: boolean }> {
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

    const fileObject = await this.prisma.fileObject.findFirst({
      where: {
        id: dto.file_object_id,
        companyId: user.companyId,
        deletedAt: null,
      },
    });

    if (!fileObject) {
      throw new NotFoundException('File not found');
    }

    if (fileObject.projectId !== report.projectId) {
      throw new ForbiddenException('File must belong to the same project as the report');
    }

    const existingAttachment = await this.prisma.dailyReportAttachment.findFirst({
      where: {
        companyId: user.companyId,
        dailyReportId: reportId,
        fileObjectId: dto.file_object_id,
      },
    });

    if (existingAttachment) {
      return { ok: true };
    }

    try {
      await this.prisma.dailyReportAttachment.create({
        data: {
          companyId: user.companyId,
          dailyReportId: reportId,
          fileObjectId: dto.file_object_id,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        return { ok: true };
      }
      throw error;
    }

    await this.auditService.record({
      companyId: user.companyId,
      actorUserId: user.userId,
      projectId: report.projectId,
      entityType: 'DAILY_REPORT',
      entityId: reportId,
      action: 'FILE_ATTACHED',
      metadata: {
        reportId,
        fileObjectId: dto.file_object_id,
      },
    });

    return { ok: true };
  }

  async deleteAttachment(
    user: PolicyUser,
    reportId: string,
    fileObjectId: string,
  ): Promise<{ ok: boolean }> {
    const report = await this.prisma.dailyReport.findFirst({
      where: {
        id: reportId,
        companyId: user.companyId,
        deletedAt: null,
      },
      select: {
        id: true,
        status: true,
        projectId: true,
        companyId: true,
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
      throw new ForbiddenException('Only project members can delete attachments');
    }

    if (report.status !== 'DRAFT') {
      throw new ConflictException('Cannot delete attachments from submitted reports');
    }

    const attachment = await this.prisma.dailyReportAttachment.findFirst({
      where: {
        dailyReportId: reportId,
        fileObjectId,
        companyId: user.companyId,
      },
    });

    if (!attachment) {
      return { ok: true };
    }

    await this.prisma.dailyReportAttachment.delete({
      where: {
        id: attachment.id,
      },
    });

    return { ok: true };
  }

  private formatDateAsYYYYMMDD(date: Date): string {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private buildProjectAddressLabel(
    project: {
      addressLine1?: string | null;
      addressLine2?: string | null;
      city?: string | null;
      region?: string | null;
      postalCode?: string | null;
      country?: string | null;
      name?: string | null;
    } | null,
  ): string {
    if (!project) return 'Unknown';
    const parts = [
      project.addressLine1?.trim(),
      project.addressLine2?.trim(),
      project.city?.trim(),
      project.region?.trim(),
      project.postalCode?.trim(),
      project.country?.trim(),
    ].filter((p): p is string => !!p);
    return parts.length > 0 ? parts.join(', ') : (project.name?.trim() ?? 'Unknown');
  }

  private async fillWeatherSnapshotInBackground(
    reportId: string,
    reportDate: string,
    projectId: string,
    companyId: string,
  ): Promise<void> {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, companyId, deletedAt: null },
      select: {
        addressLine1: true,
        addressLine2: true,
        city: true,
        region: true,
        postalCode: true,
        country: true,
        name: true,
      },
    });
    const locationLabel = this.buildProjectAddressLabel(project);

    const outcome = await this.weatherService.getDailySnapshotForReport({
      date: reportDate,
      locationLabel: locationLabel || 'Unknown',
      city: project?.city ?? undefined,
      postalCode: project?.postalCode ?? undefined,
      country: project?.country ?? undefined,
    });

    if (!outcome.ok) return;

    const summaryText = this.weatherService.formatSummaryText(outcome.result.snapshot);
    const takenAt = new Date();

    await this.prisma.dailyReport.update({
      where: { id: reportId, companyId, deletedAt: null },
      data: {
        weatherSnapshot: outcome.result.snapshot as unknown as Prisma.InputJsonValue,
        weatherSnapshotSource: outcome.result.source,
        weatherSnapshotTakenAt: takenAt,
        weatherSummaryText: summaryText,
      },
    });
  }

  async refreshWeatherSnapshot(
    user: PolicyUser,
    reportId: string,
  ): Promise<DailyReportResponseDto> {
    console.log('[DailyReportsService] refreshWeatherSnapshot CALLED', { reportId });
    const report = await this.prisma.dailyReport.findFirst({
      where: {
        id: reportId,
        companyId: user.companyId,
        deletedAt: null,
      },
      include: {
        project: {
          select: {
            addressLine1: true,
            addressLine2: true,
            city: true,
            region: true,
            postalCode: true,
            country: true,
            name: true,
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

    if (report.status !== DailyReportStatus.DRAFT) {
      throw new ConflictException('Cannot refresh weather on submitted report');
    }

    const locationLabel = this.buildProjectAddressLabel(report.project);
    const reportDate = this.formatDateAsYYYYMMDD(report.reportDate);
    const project = report.project;

    const weatherPayload = {
      date: reportDate,
      locationLabel: locationLabel || 'Unknown',
      city: project?.city ?? undefined,
      country: project?.country ?? undefined,
      postalCode: project?.postalCode ?? undefined,
      streetAddress: project?.addressLine1 ?? undefined,
      addressLine2: project?.addressLine2 ?? undefined,
    };
    console.log('[DailyReportsService] refreshWeatherSnapshot PAYLOAD to Open-Meteo', {
      city: weatherPayload.city,
      country: weatherPayload.country,
      postalCode: weatherPayload.postalCode,
      streetAddress: weatherPayload.streetAddress,
      addressLine2: weatherPayload.addressLine2,
      date: weatherPayload.date,
      locationLabel: weatherPayload.locationLabel,
    });

    const outcome = await this.weatherService.getDailySnapshotForReport(weatherPayload);

    console.log(
      '[DailyReportsService] refreshWeatherSnapshot OUTCOME',
      outcome.ok ? 'ok' : 'failed',
      outcome.ok ? undefined : { reason: outcome.failure.reason, message: outcome.failure.message },
    );

    if (!outcome.ok) {
      const reportAsIs = await this.prisma.dailyReport.findFirst({
        where: { id: reportId, companyId: user.companyId, deletedAt: null },
        include: {
          createdBy: { select: { id: true, fullName: true } },
          attachments: {
            where: { fileObject: { companyId: user.companyId, deletedAt: null } },
            include: {
              fileObject: {
                select: { id: true, originalFilename: true, mimeType: true, sizeBytes: true },
              },
            },
          },
        },
      });
      if (!reportAsIs) throw new NotFoundException('Daily report not found');
      const responseDto = {
        ...this.mapToResponseDto(reportAsIs),
        weather_refresh_error: outcome.failure.message,
      };
      console.log('[DailyReportsService] refreshWeatherSnapshot RESPONSE to client (no weather)', {
        reportId,
        weather_refresh_error: responseDto.weather_refresh_error,
      });
      return responseDto;
    }

    const summaryText = this.weatherService.formatSummaryText(outcome.result.snapshot);
    const takenAt = new Date();

    console.log('[DailyReportsService] refreshWeatherSnapshot persisting weather', {
      reportId,
      weatherSummaryText: summaryText,
      source: outcome.result.source,
    });

    const updatedReport = await this.prisma.dailyReport.update({
      where: { id: reportId, companyId: user.companyId, deletedAt: null },
      data: {
        weatherSnapshot: outcome.result.snapshot as unknown as Prisma.InputJsonValue,
        weatherSnapshotSource: outcome.result.source,
        weatherSnapshotTakenAt: takenAt,
        weatherSummaryText: summaryText,
      },
      include: {
        createdBy: {
          select: { id: true, fullName: true },
        },
        attachments: {
          where: { fileObject: { companyId: user.companyId, deletedAt: null } },
          include: {
            fileObject: {
              select: { id: true, originalFilename: true, mimeType: true, sizeBytes: true },
            },
          },
        },
      },
    });

    const responseDto = this.mapToResponseDto(updatedReport);
    console.log('[DailyReportsService] refreshWeatherSnapshot RESPONSE to client', {
      reportId,
      weather_summary_text: responseDto.weather_summary_text,
      weather_snapshot_source: responseDto.weather_snapshot_source,
      weather_refresh_error: responseDto.weather_refresh_error,
    });
    return responseDto;
  }
}
