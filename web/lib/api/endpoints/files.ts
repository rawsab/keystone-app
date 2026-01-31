import { apiClient } from "../client";
import { ApiResult } from "../types";

export interface FileMetadata {
  id: string;
  original_filename: string;
  mime_type: string;
  size_bytes: number;
  uploaded_by: {
    id: string;
    full_name: string;
  };
  created_at: string;
}

export interface CompanyFileListItem {
  id: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  created_at: string;
  uploaded_by: { id: string; full_name: string };
  project_id: string | null;
  project_name: string | null;
  object_key: string;
}

export interface PresignResponse {
  upload_url: string;
  object_key: string;
}

export interface PresignRequest {
  project_id?: string;
  original_filename?: string;
  mime_type?: string;
  size_bytes?: number;
}

export interface FinalizeRequest {
  project_id?: string;
  object_key: string;
  original_filename: string;
  mime_type: string;
  size_bytes: number;
}

export interface AttachmentListItem {
  id: string;
  original_filename: string;
  mime_type: string;
  size_bytes: number;
}

export async function listProjectFiles(
  projectId: string,
): ApiResult<FileMetadata[]> {
  return apiClient.get<FileMetadata[]>(`/projects/${projectId}/files`);
}

export async function listCompanyFiles(): ApiResult<CompanyFileListItem[]> {
  return apiClient.get<CompanyFileListItem[]>("/files");
}

export async function getFileDownloadUrl(
  fileObjectId: string,
): ApiResult<{ download_url: string }> {
  return apiClient.get<{ download_url: string }>(
    `/files/${fileObjectId}/download-url`,
  );
}

export async function deleteFile(fileObjectId: string): ApiResult<null> {
  return apiClient.delete<null>(`/files/${fileObjectId}`);
}

export async function presignUpload(
  payload: PresignRequest,
): ApiResult<PresignResponse> {
  return apiClient.post<PresignResponse>("/files/presign", payload);
}

export async function finalizeUpload(
  payload: FinalizeRequest,
): ApiResult<FileMetadata> {
  return apiClient.post<FileMetadata>("/files/finalize", payload);
}

export async function attachFileToReport(
  reportId: string,
  fileObjectId: string,
): ApiResult<{ ok: boolean }> {
  return apiClient.post(`/daily-reports/${reportId}/attachments`, {
    file_object_id: fileObjectId,
  });
}

export async function deleteAttachment(
  reportId: string,
  fileObjectId: string,
): ApiResult<{ ok: boolean }> {
  return apiClient.delete(
    `/daily-reports/${reportId}/attachments/${fileObjectId}`,
  );
}
