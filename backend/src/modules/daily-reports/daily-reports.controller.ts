import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../security/guards/jwt-auth.guard';
import { CurrentUser } from '../../security/decorators/current-user.decorator';
import { AuthUser } from '../../security/jwt.strategy';
import { DailyReportsService } from './daily-reports.service';
import { DailyReportListItemDto } from './dto/daily-report-list-item.dto';
import { CreateDailyReportDto } from './dto/create-daily-report.dto';
import { DailyReportResponseDto } from './dto/daily-report-response.dto';
import { ApiResponse } from '../../common/interfaces/api-response.interface';

@Controller('api/v1/projects/:projectId/daily-reports')
@UseGuards(JwtAuthGuard)
export class DailyReportsController {
  constructor(private readonly dailyReportsService: DailyReportsService) {}

  @Get()
  async listForProject(
    @CurrentUser() user: AuthUser,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Query('from_date') fromDate?: string,
    @Query('to_date') toDate?: string,
  ): Promise<ApiResponse<DailyReportListItemDto[]>> {
    const reports = await this.dailyReportsService.listForProject(
      {
        userId: user.userId,
        companyId: user.companyId,
        role: user.role,
      },
      projectId,
      fromDate,
      toDate,
    );

    return {
      data: reports,
      error: null,
    };
  }

  @Post()
  async createOrGetDraft(
    @CurrentUser() user: AuthUser,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: CreateDailyReportDto,
  ): Promise<ApiResponse<DailyReportResponseDto>> {
    const report = await this.dailyReportsService.createOrGetDraftForDate(
      {
        userId: user.userId,
        companyId: user.companyId,
        role: user.role,
      },
      projectId,
      dto,
    );

    return {
      data: report,
      error: null,
    };
  }
}
