import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infra/db/prisma.service';

/**
 * Users service
 */
@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get current user by ID
   */
  async getCurrentUser(userId: string, companyId: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        companyId,
        deletedAt: null,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      full_name: user.fullName,
      role: user.role,
    };
  }
}
