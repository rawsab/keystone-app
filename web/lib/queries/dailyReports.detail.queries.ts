import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getDailyReport,
  updateDailyReport,
  UpdateDailyReportPayload,
} from "../api/endpoints/dailyReports";

export function useDailyReport(reportId: string) {
  return useQuery({
    queryKey: ["dailyReports", "detail", reportId],
    queryFn: () => getDailyReport(reportId),
    enabled: !!reportId,
  });
}

export function useUpdateDailyReport(reportId: string, projectId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateDailyReportPayload) =>
      updateDailyReport(reportId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["dailyReports", "detail", reportId],
      });

      if (projectId) {
        queryClient.invalidateQueries({
          queryKey: ["projects", projectId, "dailyReports"],
        });
      }
    },
  });
}
