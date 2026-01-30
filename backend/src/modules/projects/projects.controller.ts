import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../security/guards/jwt-auth.guard';
import { CurrentUser } from '../../security/decorators/current-user.decorator';
import { AuthUser } from '../../security/jwt.strategy';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { ApiResponse } from '../../common/interfaces/api-response.interface';
import { ProjectListItemDto } from './dto/project-list-item.dto';
import { ProjectResponseDto } from './dto/project-response.dto';

@Controller('api/v1/projects')
@UseGuards(JwtAuthGuard)
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  async listProjects(
    @CurrentUser() user: AuthUser,
  ): Promise<ApiResponse<ProjectListItemDto[]>> {
    const projects = await this.projectsService.listProjects({
      userId: user.userId,
      companyId: user.companyId,
      role: user.role,
    });

    return {
      data: projects,
      error: null,
    };
  }

  @Post()
  async createProject(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateProjectDto,
  ): Promise<ApiResponse<ProjectResponseDto>> {
    const project = await this.projectsService.createProject(
      {
        userId: user.userId,
        companyId: user.companyId,
        role: user.role,
      },
      dto,
    );

    return {
      data: project,
      error: null,
    };
  }

  @Post(':projectId/archive')
  async archiveProject(
    @CurrentUser() user: AuthUser,
    @Param('projectId') projectId: string,
  ): Promise<ApiResponse<ProjectResponseDto>> {
    const project = await this.projectsService.archiveProject(
      {
        userId: user.userId,
        companyId: user.companyId,
        role: user.role,
      },
      projectId,
    );

    return {
      data: project,
      error: null,
    };
  }
}
