import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infra/db/prisma.service';
import { MembershipService } from '../../security/rbac/membership.service';
import { PolicyUser } from '../../security/rbac';
import { DailyReportListItemDto } from './dto/daily-report-list-item.dto';

@Injectable()
export class DailyReportsService {
  constructor(
    private readonly prisma: PrismaService,
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

  private formatDateAsYYYYMMDD(date: Date): string {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
