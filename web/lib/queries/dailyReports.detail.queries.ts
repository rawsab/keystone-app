import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getDailyReport,
  updateDailyReport,
  submitDailyReport,
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

export function useSubmitDailyReport(reportId: string, projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => submitDailyReport(reportId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["dailyReports", "detail", reportId],
      });

      queryClient.invalidateQueries({
        queryKey: ["projects", projectId, "dailyReports"],
      });

      queryClient.invalidateQueries({
        queryKey: ["dashboard"],
      });
    },
  });
}
