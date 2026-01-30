import { useQuery } from "@tanstack/react-query";
import {
  listDailyReports,
  DailyReportsFilters,
} from "../api/endpoints/dailyReports";

function normalizeFilters(
  filters?: DailyReportsFilters,
): Record<string, string> | undefined {
  if (!filters) return undefined;

  const keys = Object.keys(filters).sort();
  if (keys.length === 0) return undefined;

  const normalized: Record<string, string> = {};
  keys.forEach((key) => {
    const value = filters[key as keyof DailyReportsFilters];
    if (value !== undefined) {
      normalized[key] = value;
    }
  });

  return Object.keys(normalized).length > 0 ? normalized : undefined;
}

export function useDailyReportsList(
  projectId: string,
  filters?: DailyReportsFilters,
) {
  const normalizedFilters = normalizeFilters(filters);

  return useQuery({
    queryKey: ["projects", projectId, "dailyReports", normalizedFilters],
    queryFn: () => listDailyReports(projectId, filters),
    enabled: !!projectId,
  });
}
