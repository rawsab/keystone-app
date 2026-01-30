import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../security/guards/jwt-auth.guard';
import { CurrentUser } from '../../../security/decorators/current-user.decorator';
import { AuthUser } from '../../../security/jwt.strategy';
import { ProjectMembersService } from './project-members.service';
import { AddMemberDto } from './dto/add-member.dto';
import { ApiResponse } from '../../../common/interfaces/api-response.interface';
import { MemberResponseDto } from './dto/member-response.dto';

@Controller('api/v1/projects/:projectId/members')
@UseGuards(JwtAuthGuard)
export class ProjectMembersController {
  constructor(
    private readonly projectMembersService: ProjectMembersService,
  ) {}

  @Get()
  async listMembers(
    @CurrentUser() user: AuthUser,
    @Param('projectId') projectId: string,
  ): Promise<ApiResponse<MemberResponseDto[]>> {
    const members = await this.projectMembersService.listMembers(
      {
        userId: user.userId,
        companyId: user.companyId,
        role: user.role,
      },
      projectId,
    );

    return {
      data: members,
      error: null,
    };
  }

  @Post()
  async addMember(
    @CurrentUser() user: AuthUser,
    @Param('projectId') projectId: string,
    @Body() dto: AddMemberDto,
  ): Promise<ApiResponse<MemberResponseDto>> {
    const member = await this.projectMembersService.addMember(
      {
        userId: user.userId,
        companyId: user.companyId,
        role: user.role,
      },
      projectId,
      dto,
    );

    return {
      data: member,
      error: null,
    };
  }
}
