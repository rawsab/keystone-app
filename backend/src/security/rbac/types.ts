/**
 * System-level user roles
 */
export enum UserRole {
  OWNER = 'OWNER',
  MEMBER = 'MEMBER',
}

/**
 * Project-level member roles
 */
export enum ProjectRole {
  OWNER = 'OWNER',
  MEMBER = 'MEMBER',
}

/**
 * Daily report status values
 */
export enum DailyReportStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  APPROVED = 'APPROVED',
}

/**
 * Project status values
 */
export enum ProjectStatus {
  ACTIVE = 'ACTIVE',
  ARCHIVED = 'ARCHIVED',
}
