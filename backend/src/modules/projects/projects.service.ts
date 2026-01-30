import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../infra/db/prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  canCreateProject,
  canArchiveProject,
  PolicyUser,
  ProjectStatus,
  ProjectRole,
} from '../../security/rbac';
import { CreateProjectDto } from './dto/create-project.dto';
import { ProjectListItemDto } from './dto/project-list-item.dto';
import { ProjectResponseDto } from './dto/project-response.dto';

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async listProjects(user: PolicyUser): Promise<ProjectListItemDto[]> {
    const projects = await this.prisma.project.findMany({
      where: {
        companyId: user.companyId,
        deletedAt: null,
        members: {
          some: {
            userId: user.userId,
            companyId: user.companyId,
          },
        },
      },
      select: {
        id: true,
        name: true,
        status: true,
        updatedAt: true,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    return projects.map((project) => ({
      id: project.id,
      name: project.name,
      status: project.status,
      updated_at: project.updatedAt.toISOString(),
    }));
  }

  async createProject(
    user: PolicyUser,
    dto: CreateProjectDto,
  ): Promise<ProjectResponseDto> {
    if (!canCreateProject(user)) {
      throw new ForbiddenException('Only OWNER can create projects');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const project = await tx.project.create({
        data: {
          companyId: user.companyId,
          name: dto.name,
          location: dto.location,
          status: ProjectStatus.ACTIVE,
        },
      });

      await tx.projectMember.create({
        data: {
          companyId: user.companyId,
          projectId: project.id,
          userId: user.userId,
          projectRole: ProjectRole.OWNER,
        },
      });

      await tx.auditEvent.create({
        data: {
          companyId: user.companyId,
          actorUserId: user.userId,
          projectId: project.id,
          entityType: 'PROJECT',
          entityId: project.id,
          action: 'CREATED',
        },
      });

      return project;
    });

    return {
      id: result.id,
      name: result.name,
      status: result.status,
    };
  }

  async archiveProject(
    user: PolicyUser,
    projectId: string,
  ): Promise<ProjectResponseDto> {
    if (!canArchiveProject(user)) {
      throw new ForbiddenException('Only OWNER can archive projects');
    }

    const existingProject = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        companyId: user.companyId,
        deletedAt: null,
      },
    });

    if (!existingProject) {
      throw new NotFoundException('Project not found');
    }

    const project = await this.prisma.project.update({
      where: {
        id: projectId,
      },
      data: {
        status: ProjectStatus.ARCHIVED,
        updatedAt: new Date(),
      },
    });

    await this.auditService.record({
      companyId: user.companyId,
      actorUserId: user.userId,
      projectId: project.id,
      entityType: 'PROJECT',
      entityId: project.id,
      action: 'ARCHIVED',
    });

    return {
      id: project.id,
      name: project.name,
      status: project.status,
    };
  }
}
