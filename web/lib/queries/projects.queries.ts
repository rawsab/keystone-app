import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listProjects,
  createProject,
  getProject,
  updateProject,
} from "../api/endpoints/projects";

export function useProjectsList() {
  return useQuery({
    queryKey: ["projects", "list"],
    queryFn: listProjects,
  });
}

export function useProject(projectId: string) {
  return useQuery({
    queryKey: ["projects", projectId],
    queryFn: () => getProject(projectId),
    enabled: !!projectId,
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects", "list"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useUpdateProject(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: Parameters<typeof updateProject>[1]) =>
      updateProject(projectId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects", "list"] });
      queryClient.invalidateQueries({ queryKey: ["projects", projectId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}
