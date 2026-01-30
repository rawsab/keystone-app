export class DashboardProjectDto {
  id: string;
  name: string;
  status: string;
  updated_at: string;
  location: string | null;
}

export class DashboardReportCreatorDto {
  id: string;
  full_name: string;
}

export class DashboardReportDto {
  id: string;
  project_id: string;
  project_name: string;
  report_date: string;
  status: string;
  updated_at: string;
  created_by: DashboardReportCreatorDto;
}

export class ReportsThisWeekDto {
  submitted_count: number;
  draft_count: number;
  total_count: number;
}

export class NeedsAttentionDto {
  stale_drafts_count: number;
}

export class DashboardResponseDto {
  active_projects_count: number;
  total_projects_count: number;
  reports_this_week: ReportsThisWeekDto;
  recent_projects: DashboardProjectDto[];
  recent_reports: DashboardReportDto[];
  needs_attention: NeedsAttentionDto;
}
