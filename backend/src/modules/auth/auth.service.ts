import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../infra/db/prisma.service';
import { AuditService } from '../audit/audit.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from '../../security/jwt.strategy';

const BCRYPT_ROUNDS = 10;

/**
 * Authentication service
 * Handles signup, login, and token generation
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Sign up a new user and company
   * Creates company, user (OWNER role), and audit events in a transaction
   */
  async signup(dto: SignupDto) {
    const existingUser = await this.prisma.user.findFirst({
      where: { email: dto.email.toLowerCase() },
    });

    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    const result = await this.prisma.$transaction(async (tx) => {
      const company = await tx.company.create({
        data: {
          name: dto.company_name,
          timezone: 'America/New_York',
        },
      });

      const user = await tx.user.create({
        data: {
          companyId: company.id,
          email: dto.email.toLowerCase(),
          fullName: dto.full_name,
          role: 'OWNER',
          passwordHash,
        },
      });

      await tx.auditEvent.create({
        data: {
          companyId: company.id,
          actorUserId: user.id,
          entityType: 'COMPANY',
          entityId: company.id,
          action: 'CREATED',
        },
      });

      await tx.auditEvent.create({
        data: {
          companyId: company.id,
          actorUserId: user.id,
          entityType: 'USER',
          entityId: user.id,
          action: 'CREATED',
        },
      });

      return { company, user };
    });

    const token = this.generateToken(result.user.id, result.company.id);

    return {
      token,
      user: {
        id: result.user.id,
        email: result.user.email,
        full_name: result.user.fullName,
        role: result.user.role,
      },
    };
  }

  /**
   * Log in an existing user
   * Validates credentials and returns JWT token
   */
  async login(dto: LoginDto) {
    const user = await this.prisma.user.findFirst({
      where: {
        email: dto.email.toLowerCase(),
        deletedAt: null,
      },
    });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const token = this.generateToken(user.id, user.companyId);

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.fullName,
        role: user.role,
      },
    };
  }

  /**
   * Generate JWT token for authenticated user
   */
  private generateToken(userId: string, companyId: string): string {
    const payload: JwtPayload = {
      sub: userId,
      companyId,
    };

    return this.jwtService.sign(payload);
  }
}
