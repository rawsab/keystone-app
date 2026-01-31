import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listProjectContents,
  listCompanyContents,
  createProjectFolder as createProjectFolderApi,
  createCompanyFolder as createCompanyFolderApi,
  renameProjectFolder as renameProjectFolderApi,
  renameCompanyFolder as renameCompanyFolderApi,
  deleteProjectFolder as deleteProjectFolderApi,
  deleteCompanyFolder as deleteCompanyFolderApi,
  getFileDownloadUrl,
  renameFile as renameFileApi,
  deleteFile as deleteFileApi,
} from "../api/endpoints/files";

export const filesQueryKeys = {
  all: ["files"] as const,
  project: (projectId: string, folderId?: string | null) =>
    ["files", "project", projectId, folderId ?? "root"] as const,
  company: (folderId?: string | null) =>
    ["files", "company", folderId ?? "root"] as const,
  downloadUrl: (fileId: string) => ["files", "download-url", fileId] as const,
};

export function useProjectContents(
  projectId: string,
  folderId?: string | null,
  options?: { enabled?: boolean },
) {
  const enabled = options?.enabled ?? true;
  return useQuery({
    queryKey: filesQueryKeys.project(projectId, folderId),
    queryFn: () => listProjectContents(projectId, folderId),
    enabled: !!projectId && enabled,
  });
}

export function useCompanyContents(
  folderId?: string | null,
  options?: { enabled?: boolean },
) {
  const enabled = options?.enabled ?? true;
  return useQuery({
    queryKey: filesQueryKeys.company(folderId),
    queryFn: () => listCompanyContents(folderId),
    enabled,
  });
}

export function useCreateProjectFolder(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { name: string; parent_folder_id?: string }) =>
      createProjectFolderApi(projectId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: filesQueryKeys.all });
      queryClient.invalidateQueries({
        predicate: (q) =>
          q.queryKey[0] === "files" &&
          q.queryKey[1] === "project" &&
          q.queryKey[2] === projectId,
      });
    },
  });
}

export function useCreateCompanyFolder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { name: string; parent_folder_id?: string }) =>
      createCompanyFolderApi(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: filesQueryKeys.all });
      queryClient.invalidateQueries({
        predicate: (q) =>
          q.queryKey[0] === "files" && q.queryKey[1] === "company",
      });
    },
  });
}

export function useRenameProjectFolder(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ folderId, name }: { folderId: string; name: string }) =>
      renameProjectFolderApi(projectId, folderId, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: filesQueryKeys.all });
      queryClient.invalidateQueries({
        predicate: (q) =>
          q.queryKey[0] === "files" &&
          q.queryKey[1] === "project" &&
          q.queryKey[2] === projectId,
      });
    },
  });
}

export function useRenameCompanyFolder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ folderId, name }: { folderId: string; name: string }) =>
      renameCompanyFolderApi(folderId, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: filesQueryKeys.all });
      queryClient.invalidateQueries({
        predicate: (q) =>
          q.queryKey[0] === "files" && q.queryKey[1] === "company",
      });
    },
  });
}

export function useDeleteProjectFolder(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (folderId: string) =>
      deleteProjectFolderApi(projectId, folderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: filesQueryKeys.all });
      queryClient.invalidateQueries({
        predicate: (q) =>
          q.queryKey[0] === "files" &&
          q.queryKey[1] === "project" &&
          q.queryKey[2] === projectId,
      });
    },
  });
}

export function useDeleteCompanyFolder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (folderId: string) => deleteCompanyFolderApi(folderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: filesQueryKeys.all });
      queryClient.invalidateQueries({
        predicate: (q) =>
          q.queryKey[0] === "files" && q.queryKey[1] === "company",
      });
    },
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: filesQueryKeys.all });
      if (options?.projectId) {
        queryClient.invalidateQueries({
          predicate: (q) =>
            q.queryKey[0] === "files" &&
            q.queryKey[1] === "project" &&
            q.queryKey[2] === options.projectId,
        });
      }
    },
  });
}

export function useDeleteFile(options?: { projectId?: string }) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (fileObjectId: string) => deleteFileApi(fileObjectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: filesQueryKeys.all });
      if (options?.projectId) {
        queryClient.invalidateQueries({
          predicate: (q) =>
            q.queryKey[0] === "files" &&
            q.queryKey[1] === "project" &&
            q.queryKey[2] === options.projectId,
        });
      }
    },
  });
}
