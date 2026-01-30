import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infra/db/prisma.service';

/**
 * Audit service for recording system events
 */
@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Record an audit event
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
      await this.prisma.auditEvent.create({
      data: {
        companyId: params.companyId,
        actorUserId: params.actorUserId,
        projectId: params.projectId,
        entityType: params.entityType,
        entityId: params.entityId,
        action: params.action,
        metadataJson: params.metadata as any,
      },
    });
  }
}
