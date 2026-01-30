import { Global, Module } from '@nestjs/common';
import { MembershipService } from './membership.service';

/**
 * Global RBAC module providing policy helpers and membership checks
 */
@Global()
@Module({
  providers: [MembershipService],
  exports: [MembershipService],
})
export class RbacModule {}
