import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../infra/db/prisma.service';

/**
 * Audit service for recording system events
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Record an audit event
   * Non-blocking: failures are logged but do not throw
   */
  async record(params: {
    companyId: string;
    actorUserId: string;
    projectId?: string;
    entityType: string;
    entityId: string;
    action: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    try {
      await this.prisma.auditEvent.create({
        data: {
          companyId: params.companyId,
          actorUserId: params.actorUserId,
          projectId: params.projectId,
          entityType: params.entityType,
          entityId: params.entityId,
          action: params.action,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          metadataJson: params.metadata as any,
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to record audit event: ${params.entityType}.${params.action}`,
        error,
      );
    }
  }
}
