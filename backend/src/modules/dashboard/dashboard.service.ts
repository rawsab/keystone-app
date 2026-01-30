import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infra/db/prisma.service';
import { PolicyUser } from '../../security/rbac/policies';
import { DashboardResponseDto } from './dto/dashboard-response.dto';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard(user: PolicyUser): Promise<DashboardResponseDto> {
    const projectMemberships = await this.prisma.projectMember.findMany({
      where: {
        userId: user.userId,
        companyId: user.companyId,
      },
      select: {
        projectId: true,
      },
    });

    const accessibleProjectIds = projectMemberships.map((m) => m.projectId);

    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - 7);

    const staleDraftThreshold = new Date(now);
    staleDraftThreshold.setHours(now.getHours() - 48);

    const [
      allProjects,
      activeProjects,
      reportsThisWeek,
      staleDrafts,
      recentProjects,
      recentReports,
    ] = await Promise.all([
      this.prisma.project.count({
        where: {
          companyId: user.companyId,
          deletedAt: null,
          id: { in: accessibleProjectIds },
        },
      }),

      this.prisma.project.count({
        where: {
          companyId: user.companyId,
          deletedAt: null,
          status: 'ACTIVE',
          id: { in: accessibleProjectIds },
        },
      }),

      this.prisma.dailyReport.findMany({
        where: {
          companyId: user.companyId,
          deletedAt: null,
          projectId: { in: accessibleProjectIds },
          createdAt: { gte: weekStart },
        },
        select: {
          status: true,
        },
      }),

      this.prisma.dailyReport.count({
        where: {
          companyId: user.companyId,
          deletedAt: null,
          projectId: { in: accessibleProjectIds },
          status: 'DRAFT',
          updatedAt: { lt: staleDraftThreshold },
        },
      }),

      this.prisma.project.findMany({
        where: {
          companyId: user.companyId,
          deletedAt: null,
          id: { in: accessibleProjectIds },
        },
        select: {
          id: true,
          name: true,
          status: true,
          location: true,
          updatedAt: true,
        },
        orderBy: {
          updatedAt: 'desc',
        },
        take: 5,
      }),

      this.prisma.dailyReport.findMany({
        where: {
          companyId: user.companyId,
          deletedAt: null,
          projectId: { in: accessibleProjectIds },
        },
        select: {
          id: true,
          projectId: true,
          reportDate: true,
          status: true,
          updatedAt: true,
          createdBy: {
            select: {
              id: true,
              fullName: true,
            },
          },
          project: {
            select: {
              name: true,
            },
          },
        },
        orderBy: {
          updatedAt: 'desc',
        },
        take: 5,
      }),
    ]);

    const submittedCount = reportsThisWeek.filter((r) => r.status === 'SUBMITTED').length;
    const draftCount = reportsThisWeek.filter((r) => r.status === 'DRAFT').length;

    return {
      active_projects_count: activeProjects,
      total_projects_count: allProjects,
      reports_this_week: {
        submitted_count: submittedCount,
        draft_count: draftCount,
        total_count: reportsThisWeek.length,
      },
      recent_projects: recentProjects.map((p) => ({
        id: p.id,
        name: p.name,
        status: p.status,
        updated_at: p.updatedAt.toISOString(),
        location: p.location,
      })),
      recent_reports: recentReports.map((r) => ({
        id: r.id,
        project_id: r.projectId,
        project_name: r.project.name,
        report_date: this.formatDateAsYYYYMMDD(r.reportDate),
        status: r.status,
        updated_at: r.updatedAt.toISOString(),
        created_by: {
          id: r.createdBy.id,
          full_name: r.createdBy.fullName,
        },
      })),
      needs_attention: {
        stale_drafts_count: staleDrafts,
      },
    };
  }

  private formatDateAsYYYYMMDD(date: Date): string {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
