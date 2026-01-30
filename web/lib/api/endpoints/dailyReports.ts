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
}

export interface DailyReportsFilters {
  from_date?: string;
  to_date?: string;
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
