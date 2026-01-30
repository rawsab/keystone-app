import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../security/guards/jwt-auth.guard';
import { CurrentUser } from '../../security/decorators/current-user.decorator';
import { AuthUser } from '../../security/jwt.strategy';
import { DailyReportsService } from './daily-reports.service';
import { DailyReportListItemDto } from './dto/daily-report-list-item.dto';
import { ApiResponse } from '../../common/interfaces/api-response.interface';

@Controller('api/v1/projects/:projectId/daily-reports')
@UseGuards(JwtAuthGuard)
export class DailyReportsController {
  constructor(private readonly dailyReportsService: DailyReportsService) {}

  @Get()
  async listForProject(
    @CurrentUser() user: AuthUser,
    @Param('projectId') projectId: string,
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
}
