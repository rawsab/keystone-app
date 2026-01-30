import {
  Controller,
  Get,
  Patch,
  Post,
  Param,
  Body,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../security/guards/jwt-auth.guard';
import { CurrentUser } from '../../security/decorators/current-user.decorator';
import { AuthUser } from '../../security/jwt.strategy';
import { DailyReportsService } from './daily-reports.service';
import { UpdateDailyReportDto } from './dto/update-daily-report.dto';
import { AttachFileDto } from './dto/attach-file.dto';
import { DailyReportResponseDto } from './dto/daily-report-response.dto';
import { ApiResponse } from '../../common/interfaces/api-response.interface';

@Controller('api/v1/daily-reports')
@UseGuards(JwtAuthGuard)
export class DailyReportController {
  constructor(private readonly dailyReportsService: DailyReportsService) {}

  @Get(':reportId')
  async getById(
    @CurrentUser() user: AuthUser,
    @Param('reportId', ParseUUIDPipe) reportId: string,
  ): Promise<ApiResponse<DailyReportResponseDto>> {
    const report = await this.dailyReportsService.getById(
      {
        userId: user.userId,
        companyId: user.companyId,
        role: user.role,
      },
      reportId,
    );

    return {
      data: report,
      error: null,
    };
  }

  @Patch(':reportId')
  async updateDraft(
    @CurrentUser() user: AuthUser,
    @Param('reportId', ParseUUIDPipe) reportId: string,
    @Body() dto: UpdateDailyReportDto,
  ): Promise<ApiResponse<DailyReportResponseDto>> {
    const report = await this.dailyReportsService.updateDraft(
      {
        userId: user.userId,
        companyId: user.companyId,
        role: user.role,
      },
      reportId,
      dto,
    );

    return {
      data: report,
      error: null,
    };
  }

  @Post(':reportId/submit')
  async submitReport(
    @CurrentUser() user: AuthUser,
    @Param('reportId', ParseUUIDPipe) reportId: string,
  ): Promise<ApiResponse<DailyReportResponseDto>> {
    const report = await this.dailyReportsService.submitReport(
      {
        userId: user.userId,
        companyId: user.companyId,
        role: user.role,
      },
      reportId,
    );

    return {
      data: report,
      error: null,
    };
  }

  @Post(':reportId/attachments')
  async attachFile(
    @CurrentUser() user: AuthUser,
    @Param('reportId', ParseUUIDPipe) reportId: string,
    @Body() dto: AttachFileDto,
  ): Promise<ApiResponse<{ ok: boolean }>> {
    const result = await this.dailyReportsService.attachFile(
      {
        userId: user.userId,
        companyId: user.companyId,
        role: user.role,
      },
      reportId,
      dto,
    );

    return {
      data: result,
      error: null,
    };
  }
}
