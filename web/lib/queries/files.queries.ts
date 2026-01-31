import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listProjectFiles,
  listCompanyFiles,
  renameFile as renameFileApi,
  deleteFile as deleteFileApi,
} from "../api/endpoints/files";

export const filesQueryKeys = {
  all: ["files"] as const,
  project: (projectId: string) => ["files", "project", projectId] as const,
  company: () => ["files", "company"] as const,
};

export function useProjectFiles(projectId: string) {
  return useQuery({
    queryKey: filesQueryKeys.project(projectId),
    queryFn: () => listProjectFiles(projectId),
    enabled: !!projectId,
  });
}

export function useCompanyFiles() {
  return useQuery({
    queryKey: filesQueryKeys.company(),
    queryFn: listCompanyFiles,
  });
}

export function useRenameFile(options?: { projectId?: string }) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      fileObjectId,
      file_name,
    }: {
      fileObjectId: string;
      file_name: string;
    }) => renameFileApi(fileObjectId, { file_name }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: filesQueryKeys.all });
      if (options?.projectId) {
        queryClient.invalidateQueries({
          queryKey: filesQueryKeys.project(options.projectId),
        });
      }
    },
  });
}

export function useDeleteFile(options?: { projectId?: string }) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (fileObjectId: string) => deleteFileApi(fileObjectId),
    onSuccess: (_, __) => {
      queryClient.invalidateQueries({ queryKey: filesQueryKeys.all });
      if (options?.projectId) {
        queryClient.invalidateQueries({
          queryKey: filesQueryKeys.project(options.projectId),
        });
      }
    },
  });
}
