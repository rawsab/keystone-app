import { UserRole, DailyReportStatus } from './types';

export interface PolicyUser {
  userId: string;
  companyId: string;
  role: UserRole;
}

export interface PolicyDailyReport {
  id: string;
  companyId: string;
  projectId: string;
  status: DailyReportStatus;
  createdByUserId: string;
}

export function canCreateProject(user: PolicyUser): boolean {
  return user.role === UserRole.OWNER;
}

export function canManageProjectMembers(user: PolicyUser): boolean {
  return user.role === UserRole.OWNER;
}

export function canArchiveProject(user: PolicyUser): boolean {
  return user.role === UserRole.OWNER;
}

export function canApproveDailyReport(user: PolicyUser): boolean {
  return user.role === UserRole.OWNER;
}

export function canEditDraftDailyReport(
  user: PolicyUser,
  report: PolicyDailyReport,
): boolean {
  if (user.companyId !== report.companyId) {
    return false;
  }

  if (report.status !== DailyReportStatus.DRAFT) {
    return false;
  }

  return true;
}

export function canSubmitDailyReport(
  user: PolicyUser,
  report: PolicyDailyReport,
): boolean {
  if (user.companyId !== report.companyId) {
    return false;
  }

  if (report.status !== DailyReportStatus.DRAFT) {
    return false;
  }

  return true;
}
