import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../infra/db/prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  canCreateProject,
  canArchiveProject,
  canUpdateProject,
  PolicyUser,
  ProjectStatus,
  ProjectRole,
} from '../../security/rbac';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectListItemDto } from './dto/project-list-item.dto';
import { ProjectResponseDto } from './dto/project-response.dto';

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  private formatAddressDisplay(project: {
    addressLine1: string;
    addressLine2?: string | null;
    city: string;
    region: string;
    postalCode: string;
    country: string;
  }): string {
    const parts = [
      project.addressLine1,
      project.addressLine2,
      project.city,
      `${project.region} ${project.postalCode}`,
      project.country,
    ].filter(Boolean);
    return parts.join(', ');
  }

  async getProject(user: PolicyUser, projectId: string): Promise<ProjectResponseDto> {
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        companyId: user.companyId,
        deletedAt: null,
        members: {
          some: {
            userId: user.userId,
            companyId: user.companyId,
          },
        },
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    return {
      id: project.id,
      project_number: project.projectNumber,
      name: project.name,
      company_name: project.companyName,
      address_line_1: project.addressLine1,
      address_line_2: project.addressLine2 || undefined,
      city: project.city,
      region: project.region,
      postal_code: project.postalCode,
      country: project.country,
      address_display: this.formatAddressDisplay(project),
      location: project.location || undefined,
      status: project.status,
      updated_at: project.updatedAt.toISOString(),
    };
  }

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
        projectNumber: true,
        name: true,
        companyName: true,
        addressLine1: true,
        addressLine2: true,
        city: true,
        region: true,
        postalCode: true,
        country: true,
        status: true,
        updatedAt: true,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    return projects.map((project) => ({
      id: project.id,
      project_number: project.projectNumber,
      name: project.name,
      company_name: project.companyName,
      address_display: this.formatAddressDisplay(project),
      status: project.status,
      updated_at: project.updatedAt.toISOString(),
    }));
  }

  async createProject(user: PolicyUser, dto: CreateProjectDto): Promise<ProjectResponseDto> {
    if (!canCreateProject(user)) {
      throw new ForbiddenException('Only OWNER can create projects');
    }

    // Check for duplicate project number within company
    const existingProject = await this.prisma.project.findFirst({
      where: {
        companyId: user.companyId,
        projectNumber: dto.project_number,
        deletedAt: null,
      },
    });

    if (existingProject) {
      throw new ConflictException(
        `Project number "${dto.project_number}" already exists in your company`,
      );
    }

    const result = await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const project = await tx.project.create({
        data: {
          companyId: user.companyId,
          projectNumber: dto.project_number,
          name: dto.name,
          companyName: dto.company_name,
          addressLine1: dto.address_line_1,
          addressLine2: dto.address_line_2,
          city: dto.city,
          region: dto.region,
          postalCode: dto.postal_code,
          country: dto.country,
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
      project_number: result.projectNumber,
      name: result.name,
      company_name: result.companyName,
      address_line_1: result.addressLine1,
      address_line_2: result.addressLine2 || undefined,
      city: result.city,
      region: result.region,
      postal_code: result.postalCode,
      country: result.country,
      address_display: this.formatAddressDisplay(result),
      location: result.location || undefined,
      status: result.status,
      updated_at: result.updatedAt.toISOString(),
    };
  }

  async updateProject(
    user: PolicyUser,
    projectId: string,
    dto: UpdateProjectDto,
  ): Promise<ProjectResponseDto> {
    if (!canUpdateProject(user)) {
      throw new ForbiddenException('Only OWNER can update projects');
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

    if (dto.project_number != null && dto.project_number !== existingProject.projectNumber) {
      const duplicate = await this.prisma.project.findFirst({
        where: {
          companyId: user.companyId,
          projectNumber: dto.project_number,
          deletedAt: null,
        },
      });
      if (duplicate) {
        throw new ConflictException(
          `Project number "${dto.project_number}" already exists in your company`,
        );
      }
    }

    const data: Prisma.ProjectUpdateInput = {};
    if (dto.project_number != null) data.projectNumber = dto.project_number;
    if (dto.name != null) data.name = dto.name;
    if (dto.company_name != null) data.companyName = dto.company_name;
    if (dto.address_line_1 != null) data.addressLine1 = dto.address_line_1;
    if (dto.address_line_2 !== undefined) data.addressLine2 = dto.address_line_2 ?? null;
    if (dto.city != null) data.city = dto.city;
    if (dto.region != null) data.region = dto.region;
    if (dto.postal_code != null) data.postalCode = dto.postal_code;
    if (dto.country != null) data.country = dto.country;
    if (dto.location !== undefined) data.location = dto.location ?? null;
    if (dto.status != null) data.status = dto.status;

    const project = await this.prisma.project.update({
      where: { id: projectId },
      data,
    });

    await this.auditService.record({
      companyId: user.companyId,
      actorUserId: user.userId,
      projectId: project.id,
      entityType: 'PROJECT',
      entityId: project.id,
      action: 'UPDATED',
    });

    return {
      id: project.id,
      project_number: project.projectNumber,
      name: project.name,
      company_name: project.companyName,
      address_line_1: project.addressLine1,
      address_line_2: project.addressLine2 || undefined,
      city: project.city,
      region: project.region,
      postal_code: project.postalCode,
      country: project.country,
      address_display: this.formatAddressDisplay(project),
      location: project.location || undefined,
      status: project.status,
      updated_at: project.updatedAt.toISOString(),
    };
  }

  async archiveProject(user: PolicyUser, projectId: string): Promise<ProjectResponseDto> {
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
      project_number: project.projectNumber,
      name: project.name,
      company_name: project.companyName,
      address_line_1: project.addressLine1,
      address_line_2: project.addressLine2 || undefined,
      city: project.city,
      region: project.region,
      postal_code: project.postalCode,
      country: project.country,
      address_display: this.formatAddressDisplay(project),
      location: project.location || undefined,
      status: project.status,
      updated_at: project.updatedAt.toISOString(),
    };
  }
}
