import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { EnvService } from '../config/env.service';
import { PrismaService } from '../infra/db/prisma.service';
import { UserRole } from './rbac';

export interface JwtPayload {
  sub: string;
  companyId: string;
}

export interface AuthUser {
  userId: string;
  companyId: string;
  role: UserRole;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    envService: EnvService,
    private readonly prisma: PrismaService,
  ) {
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

    const user = await this.prisma.user.findFirst({
      where: {
        id: payload.sub,
        companyId: payload.companyId,
        deletedAt: null,
      },
      select: {
        id: true,
        companyId: true,
        role: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException();
    }

    return {
      userId: user.id,
      companyId: user.companyId,
      role: user.role as UserRole,
    };
  }
}
