import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { ApiResponse } from '../../common/interfaces/api-response.interface';

/**
 * Authentication controller
 * Handles signup and login endpoints
 */
@Controller('api/v1/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Sign up a new user and company
   */
  @Post('signup')
  async signup(@Body() dto: SignupDto): Promise<ApiResponse<{ token: string; user: unknown }>> {
    const result = await this.authService.signup(dto);
    return {
      data: result,
      error: null,
    };
  }

  /**
   * Log in an existing user
   */
  @Post('login')
  async login(@Body() dto: LoginDto): Promise<ApiResponse<{ token: string; user: unknown }>> {
    const result = await this.authService.login(dto);
    return {
      data: result,
      error: null,
    };
  }
}
