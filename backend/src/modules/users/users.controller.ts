import { Controller, Get, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../../security/guards/jwt-auth.guard';
import { CurrentUser } from '../../security/decorators/current-user.decorator';
import { AuthUser } from '../../security/jwt.strategy';
import { ApiResponse } from '../../common/interfaces/api-response.interface';

/**
 * Users controller
 */
@Controller('api/v1/users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * Get current authenticated user
   */
  @Get('me')
  async me(@CurrentUser() user: AuthUser): Promise<ApiResponse<unknown>> {
    const currentUser = await this.usersService.getCurrentUser(user.userId, user.companyId);
    return {
      data: currentUser,
      error: null,
    };
  }
}
