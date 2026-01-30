import { apiClient } from "../client";
import { ApiResult } from "../types";

export interface DailyReportListItem {
  id: string;
  report_date: string;
  status: string;
  created_by: {
    id: string;
    full_name: string;
  };
  updated_at: string;
}

export interface DailyReportsFilters {
  from_date?: string;
  to_date?: string;
}

export interface DailyReportAttachment {
  id: string;
  original_filename: string;
  mime_type: string;
  size_bytes: number;
}

export interface DailyReportDetail {
  id: string;
  project_id: string;
  report_date: string;
  status: string;
  work_completed_text: string;
  issues_delays_text: string | null;
  notes_text: string | null;
  weather_observed: Record<string, unknown> | null;
  hours_worked_total: number | null;
  created_by: {
    id: string;
    full_name: string;
  };
  submitted_at: string | null;
  updated_at: string;
  attachments: DailyReportAttachment[];
}

export interface UpdateDailyReportPayload {
  work_completed_text?: string;
  issues_delays_text?: string;
  notes_text?: string;
  weather_observed?: Record<string, unknown>;
  hours_worked_total?: number;
}

export async function listDailyReports(
  projectId: string,
  filters?: DailyReportsFilters,
): ApiResult<DailyReportListItem[]> {
  let url = `/projects/${projectId}/daily-reports`;

  if (filters) {
    const params = new URLSearchParams();
    if (filters.from_date) params.append("from_date", filters.from_date);
    if (filters.to_date) params.append("to_date", filters.to_date);
    const queryString = params.toString();
    if (queryString) {
      url += `?${queryString}`;
    }
  }

  return apiClient.get<DailyReportListItem[]>(url);
}

export async function getDailyReport(
  reportId: string,
): ApiResult<DailyReportDetail> {
  return apiClient.get<DailyReportDetail>(`/daily-reports/${reportId}`);
}

export async function updateDailyReport(
  reportId: string,
  payload: UpdateDailyReportPayload,
): ApiResult<DailyReportDetail> {
  console.log("API Call - PATCH /daily-reports/" + reportId);
  console.log("Payload:", payload);
  const result = await apiClient.patch<DailyReportDetail>(
    `/daily-reports/${reportId}`,
    payload,
  );
  console.log("Response:", result);
  return result;
}

export async function submitDailyReport(
  reportId: string,
): ApiResult<DailyReportDetail> {
  return apiClient.post<DailyReportDetail>(
    `/daily-reports/${reportId}/submit`,
    {},
  );
}

export async function getOrCreateDailyReportDraft(
  projectId: string,
  reportDate: string,
): ApiResult<DailyReportDetail> {
  return apiClient.post<DailyReportDetail>(
    `/projects/${projectId}/daily-reports`,
    { report_date: reportDate },
  );
}
