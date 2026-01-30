import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../infra/db/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { MembershipService } from '../../../security/rbac/membership.service';
import {
  canManageProjectMembers,
  PolicyUser,
} from '../../../security/rbac';
import { AddMemberDto } from './dto/add-member.dto';
import { MemberResponseDto } from './dto/member-response.dto';

@Injectable()
export class ProjectMembersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly membershipService: MembershipService,
  ) {}

  async listMembers(
    user: PolicyUser,
    projectId: string,
  ): Promise<MemberResponseDto[]> {
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

    const members = await this.prisma.projectMember.findMany({
      where: {
        projectId,
        companyId: user.companyId,
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
      orderBy: [{ projectRole: 'asc' }, { user: { fullName: 'asc' } }],
    });

    return members.map((member) => ({
      id: member.id,
      user_id: member.userId,
      full_name: member.user.fullName,
      email: member.user.email,
      project_role: member.projectRole,
    }));
  }

  async addMember(
    user: PolicyUser,
    projectId: string,
    dto: AddMemberDto,
  ): Promise<MemberResponseDto> {
    if (!canManageProjectMembers(user)) {
      throw new ForbiddenException('Only OWNER can manage project members');
    }

    const projectExists = await this.membershipService.verifyProjectExists({
      projectId,
      companyId: user.companyId,
    });

    if (!projectExists) {
      throw new NotFoundException('Project not found');
    }

    const targetUser = await this.prisma.user.findFirst({
      where: {
        id: dto.user_id,
        companyId: user.companyId,
        deletedAt: null,
      },
    });

    if (!targetUser) {
      throw new NotFoundException('User not found');
    }

    const existingMember = await this.prisma.projectMember.findFirst({
      where: {
        projectId,
        userId: dto.user_id,
        companyId: user.companyId,
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });

    if (existingMember) {
      return {
        id: existingMember.id,
        user_id: existingMember.userId,
        full_name: existingMember.user.fullName,
        email: existingMember.user.email,
        project_role: existingMember.projectRole,
      };
    }

    const member = await this.prisma.projectMember.create({
      data: {
        companyId: user.companyId,
        projectId,
        userId: dto.user_id,
        projectRole: dto.project_role,
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });

    await this.auditService.record({
      companyId: user.companyId,
      actorUserId: user.userId,
      projectId,
      entityType: 'PROJECT_MEMBER',
      entityId: member.id,
      action: 'ADDED',
      metadata: {
        userId: dto.user_id,
        projectRole: dto.project_role,
      },
    });

    return {
      id: member.id,
      user_id: member.userId,
      full_name: member.user.fullName,
      email: member.user.email,
      project_role: member.projectRole,
    };
  }
}
