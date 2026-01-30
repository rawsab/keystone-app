import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getOrCreateDailyReportDraft } from "../api/endpoints/dailyReports";

export function useGetOrCreateDailyReportDraft(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (reportDate: string) =>
      getOrCreateDailyReportDraft(projectId, reportDate),
    onSuccess: (response) => {
      if (response.data) {
        queryClient.invalidateQueries({
          queryKey: ["projects", projectId, "dailyReports"],
        });

        queryClient.invalidateQueries({
          queryKey: ["dailyReports", "detail", response.data.id],
        });
      }
    },
  });
}
