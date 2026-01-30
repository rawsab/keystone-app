import { useQuery } from "@tanstack/react-query";
import { listMembers } from "../api/endpoints/members";

export function useProjectMembers(projectId: string) {
  return useQuery({
    queryKey: ["members", projectId],
    queryFn: () => listMembers(projectId),
    enabled: !!projectId,
  });
}
