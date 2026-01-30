import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { EnvService } from '../config/env.service';

/**
 * JWT payload structure
 */
export interface JwtPayload {
  sub: string;
  companyId: string;
}

/**
 * Authenticated user context
 */
export interface AuthUser {
  userId: string;
  companyId: string;
}

/**
 * JWT authentication strategy
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(envService: EnvService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: envService.jwtSecret,
    });
  }

  async validate(payload: JwtPayload): Promise<AuthUser> {
    if (!payload.sub || !payload.companyId) {
      throw new UnauthorizedException();
    }

    return {
      userId: payload.sub,
      companyId: payload.companyId,
    };
  }
}
