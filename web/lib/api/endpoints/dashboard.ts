import { apiClient } from "../client";
import { ApiResult } from "../types";

export interface DashboardProject {
  id: string;
  name: string;
  status: string;
  updated_at: string;
  location: string | null;
}

export interface DashboardReport {
  id: string;
  project_id: string;
  project_name: string;
  report_date: string;
  status: string;
  updated_at: string;
  created_by: {
    id: string;
    full_name: string;
  };
}

export interface ReportsThisWeek {
  submitted_count: number;
  draft_count: number;
  total_count: number;
}

export interface NeedsAttention {
  stale_drafts_count: number;
}

export interface DashboardData {
  active_projects_count: number;
  total_projects_count: number;
  reports_this_week: ReportsThisWeek;
  recent_projects: DashboardProject[];
  recent_reports: DashboardReport[];
  needs_attention: NeedsAttention;
}

export async function getDashboard(): ApiResult<DashboardData> {
  return apiClient.get<DashboardData>("/dashboard");
}
