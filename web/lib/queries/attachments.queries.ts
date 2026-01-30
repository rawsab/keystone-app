import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  presignUpload,
  finalizeUpload,
  attachFileToReport,
  deleteAttachment,
  PresignRequest,
  FinalizeRequest,
} from "../api/endpoints/files";

export function useUploadAndAttach(reportId: string, projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: File) => {
      const presignPayload: PresignRequest = {
        project_id: projectId,
        original_filename: file.name,
        mime_type: file.type || "application/octet-stream",
        size_bytes: file.size,
      };

      const presignResult = await presignUpload(presignPayload);
      if (presignResult.error) {
        throw new Error(presignResult.error.message);
      }

      const { upload_url, object_key } = presignResult.data!;

      const uploadResponse = await fetch(upload_url, {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": file.type || "application/octet-stream",
        },
      });

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload file to storage");
      }

      const finalizePayload: FinalizeRequest = {
        project_id: projectId,
        object_key,
        original_filename: file.name,
        mime_type: file.type || "application/octet-stream",
        size_bytes: file.size,
      };

      const finalizeResult = await finalizeUpload(finalizePayload);
      if (finalizeResult.error) {
        throw new Error(finalizeResult.error.message);
      }

      const fileObjectId = finalizeResult.data!.id;

      const attachResult = await attachFileToReport(reportId, fileObjectId);
      if (attachResult.error) {
        throw new Error(attachResult.error.message);
      }

      return finalizeResult.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["dailyReports", "detail", reportId],
      });

      queryClient.invalidateQueries({
        queryKey: ["projects", projectId, "dailyReports"],
      });
    },
  });
}

export function useDeleteAttachment(reportId: string, projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (fileObjectId: string) =>
      deleteAttachment(reportId, fileObjectId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["dailyReports", "detail", reportId],
      });

      queryClient.invalidateQueries({
        queryKey: ["projects", projectId, "dailyReports"],
      });
    },
  });
}
