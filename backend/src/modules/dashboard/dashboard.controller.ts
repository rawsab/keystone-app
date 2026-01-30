import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../security/guards/jwt-auth.guard';
import { CurrentUser } from '../../security/decorators/current-user.decorator';
import { AuthUser } from '../../security/jwt.strategy';
import { DashboardService } from './dashboard.service';
import { DashboardResponseDto } from './dto/dashboard-response.dto';
import { ApiResponse } from '../../common/interfaces/api-response.interface';

@Controller('api/v1/dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  async getDashboard(@CurrentUser() user: AuthUser): Promise<ApiResponse<DashboardResponseDto>> {
    const dashboard = await this.dashboardService.getDashboard({
      userId: user.userId,
      companyId: user.companyId,
      role: user.role,
    });

    return {
      data: dashboard,
      error: null,
    };
  }
}
