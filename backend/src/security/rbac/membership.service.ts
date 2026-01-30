import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infra/db/prisma.service';

/**
 * Service for checking project membership
 */
@Injectable()
export class MembershipService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Check if a user is a member of a project
   */
  async isProjectMember(params: {
    userId: string;
    companyId: string;
    projectId: string;
  }): Promise<boolean> {
    const membership = await this.prisma.projectMember.findFirst({
      where: {
        companyId: params.companyId,
        projectId: params.projectId,
        userId: params.userId,
      },
    });

    return membership !== null;
  }

  /**
   * Get a user's project role
   */
  async getProjectRole(params: {
    userId: string;
    companyId: string;
    projectId: string;
  }): Promise<string | null> {
    const membership = await this.prisma.projectMember.findFirst({
      where: {
        companyId: params.companyId,
        projectId: params.projectId,
        userId: params.userId,
      },
      select: {
        projectRole: true,
      },
    });

    return membership?.projectRole ?? null;
  }

  /**
   * Verify that a project exists and belongs to the company
   */
  async verifyProjectExists(params: {
    projectId: string;
    companyId: string;
  }): Promise<boolean> {
    const project = await this.prisma.project.findFirst({
      where: {
        id: params.projectId,
        companyId: params.companyId,
        deletedAt: null,
      },
    });

    return project !== null;
  }
}
