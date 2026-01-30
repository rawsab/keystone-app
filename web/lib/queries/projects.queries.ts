import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listProjects, createProject } from "../api/endpoints/projects";

export function useProjectsList() {
  return useQuery({
    queryKey: ["projects", "list"],
    queryFn: listProjects,
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects", "list"] });
    },
  });
}
