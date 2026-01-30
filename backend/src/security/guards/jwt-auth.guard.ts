import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * JWT authentication guard
 * Protects routes requiring authentication
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
