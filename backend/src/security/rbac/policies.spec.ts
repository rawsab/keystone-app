import {
  canCreateProject,
  canManageProjectMembers,
  canArchiveProject,
  canApproveDailyReport,
  canEditDraftDailyReport,
  canSubmitDailyReport,
  PolicyUser,
  PolicyDailyReport,
} from './policies';
import { UserRole, DailyReportStatus } from './types';

describe('RBAC Policies', () => {
  const ownerUser: PolicyUser = {
    userId: 'user-1',
    companyId: 'company-1',
    role: UserRole.OWNER,
  };

  const memberUser: PolicyUser = {
    userId: 'user-2',
    companyId: 'company-1',
    role: UserRole.MEMBER,
  };

  describe('canCreateProject', () => {
    it('should allow OWNER to create project', () => {
      expect(canCreateProject(ownerUser)).toBe(true);
    });

    it('should deny MEMBER from creating project', () => {
      expect(canCreateProject(memberUser)).toBe(false);
    });
  });

  describe('canManageProjectMembers', () => {
    it('should allow OWNER to manage members', () => {
      expect(canManageProjectMembers(ownerUser)).toBe(true);
    });

    it('should deny MEMBER from managing members', () => {
      expect(canManageProjectMembers(memberUser)).toBe(false);
    });
  });

  describe('canArchiveProject', () => {
    it('should allow OWNER to archive project', () => {
      expect(canArchiveProject(ownerUser)).toBe(true);
    });

    it('should deny MEMBER from archiving project', () => {
      expect(canArchiveProject(memberUser)).toBe(false);
    });
  });

  describe('canApproveDailyReport', () => {
    it('should allow OWNER to approve report', () => {
      expect(canApproveDailyReport(ownerUser)).toBe(true);
    });

    it('should deny MEMBER from approving report', () => {
      expect(canApproveDailyReport(memberUser)).toBe(false);
    });
  });

  describe('canEditDraftDailyReport', () => {
    const draftReport: PolicyDailyReport = {
      id: 'report-1',
      companyId: 'company-1',
      projectId: 'project-1',
      status: DailyReportStatus.DRAFT,
      createdByUserId: 'user-2',
    };

    const submittedReport: PolicyDailyReport = {
      ...draftReport,
      status: DailyReportStatus.SUBMITTED,
    };

    const approvedReport: PolicyDailyReport = {
      ...draftReport,
      status: DailyReportStatus.APPROVED,
    };

    it('should allow editing DRAFT report in same company', () => {
      expect(canEditDraftDailyReport(memberUser, draftReport)).toBe(true);
      expect(canEditDraftDailyReport(ownerUser, draftReport)).toBe(true);
    });

    it('should deny editing SUBMITTED report', () => {
      expect(canEditDraftDailyReport(memberUser, submittedReport)).toBe(false);
    });

    it('should deny editing APPROVED report', () => {
      expect(canEditDraftDailyReport(memberUser, approvedReport)).toBe(false);
    });

    it('should deny editing report from different company', () => {
      const differentCompanyUser: PolicyUser = {
        ...memberUser,
        companyId: 'company-2',
      };
      expect(canEditDraftDailyReport(differentCompanyUser, draftReport)).toBe(
        false,
      );
    });
  });

  describe('canSubmitDailyReport', () => {
    const draftReport: PolicyDailyReport = {
      id: 'report-1',
      companyId: 'company-1',
      projectId: 'project-1',
      status: DailyReportStatus.DRAFT,
      createdByUserId: 'user-2',
    };

    const submittedReport: PolicyDailyReport = {
      ...draftReport,
      status: DailyReportStatus.SUBMITTED,
    };

    it('should allow submitting DRAFT report in same company', () => {
      expect(canSubmitDailyReport(memberUser, draftReport)).toBe(true);
      expect(canSubmitDailyReport(ownerUser, draftReport)).toBe(true);
    });

    it('should deny submitting already SUBMITTED report', () => {
      expect(canSubmitDailyReport(memberUser, submittedReport)).toBe(false);
    });

    it('should deny submitting report from different company', () => {
      const differentCompanyUser: PolicyUser = {
        ...memberUser,
        companyId: 'company-2',
      };
      expect(canSubmitDailyReport(differentCompanyUser, draftReport)).toBe(
        false,
      );
    });
  });
});
