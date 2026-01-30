import { useQuery } from "@tanstack/react-query";
import {
  listDailyReports,
  DailyReportsFilters,
} from "../api/endpoints/dailyReports";

export function useDailyReportsList(
  projectId: string,
  filters?: DailyReportsFilters,
) {
  return useQuery({
    queryKey: ["dailyReports", projectId, filters],
    queryFn: () => listDailyReports(projectId, filters),
    enabled: !!projectId,
  });
}
