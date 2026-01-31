import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listProjectFiles,
  listCompanyFiles,
  getFileDownloadUrl,
  renameFile as renameFileApi,
  deleteFile as deleteFileApi,
} from "../api/endpoints/files";

export const filesQueryKeys = {
  all: ["files"] as const,
  project: (projectId: string) => ["files", "project", projectId] as const,
  company: () => ["files", "company"] as const,
  downloadUrl: (fileId: string) => ["files", "download-url", fileId] as const,
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

/** Cached download URL for a file; enable only when needed (e.g. for thumbnail). Use preview: true for thumbnails so the URL does not depend on filename (avoids signature issues with spaces/special chars). */
export function useFileDownloadUrl(
  fileId: string,
  enabled: boolean,
  options?: { preview?: boolean },
) {
  const preview = options?.preview ?? false;
  return useQuery({
    queryKey: [...filesQueryKeys.downloadUrl(fileId), preview],
    queryFn: async () => {
      const res = await getFileDownloadUrl(fileId, { preview });
      if (res.error || !res.data?.download_url) {
        throw new Error(res.error?.message ?? "Failed to get download URL");
      }
      return res.data.download_url;
    },
    enabled: !!fileId && enabled,
    staleTime: 4 * 60 * 1000, // 4 min (presigned URLs often 1h)
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
