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

export interface FolderListItem {
  id: string;
  name: string;
  parent_folder_id: string | null;
  created_at: string;
  total_size_bytes: number;
}

export interface ProjectContents {
  folders: FolderListItem[];
  files: FileMetadata[];
}

export interface CompanyContents {
  folders: FolderListItem[];
  files: CompanyFileListItem[];
}

export interface PresignRequest {
  project_id?: string;
  folder_id?: string;
  original_filename?: string;
  mime_type?: string;
  size_bytes?: number;
}

export interface FinalizeRequest {
  project_id?: string;
  folder_id?: string;
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

export async function listProjectContents(
  projectId: string,
  folderId?: string | null,
): ApiResult<ProjectContents> {
  const search = folderId ? `?folder_id=${encodeURIComponent(folderId)}` : "";
  return apiClient.get<ProjectContents>(
    `/projects/${projectId}/files${search}`,
  );
}

export async function listCompanyContents(
  folderId?: string | null,
): ApiResult<CompanyContents> {
  const search = folderId ? `?folder_id=${encodeURIComponent(folderId)}` : "";
  return apiClient.get<CompanyContents>(`/files${search}`);
}

export async function createProjectFolder(
  projectId: string,
  payload: { name: string; parent_folder_id?: string },
): ApiResult<FolderListItem> {
  return apiClient.post<FolderListItem>(
    `/projects/${projectId}/folders`,
    payload,
  );
}

export async function createCompanyFolder(payload: {
  name: string;
  parent_folder_id?: string;
}): ApiResult<FolderListItem> {
  return apiClient.post<FolderListItem>("/files/folders", payload);
}

export async function renameProjectFolder(
  projectId: string,
  folderId: string,
  payload: { name: string },
): ApiResult<FolderListItem> {
  return apiClient.patch<FolderListItem>(
    `/projects/${projectId}/folders/${folderId}`,
    payload,
  );
}

export async function renameCompanyFolder(
  folderId: string,
  payload: { name: string },
): ApiResult<FolderListItem> {
  return apiClient.patch<FolderListItem>(`/files/folders/${folderId}`, payload);
}

export async function deleteProjectFolder(
  projectId: string,
  folderId: string,
): ApiResult<null> {
  return apiClient.delete<null>(`/projects/${projectId}/folders/${folderId}`);
}

export async function deleteCompanyFolder(folderId: string): ApiResult<null> {
  return apiClient.delete<null>(`/files/folders/${folderId}`);
}

export async function getFileDownloadUrl(
  fileObjectId: string,
  options?: { preview?: boolean },
): ApiResult<{ download_url: string }> {
  const search = options?.preview ? "?preview=1" : "";
  return apiClient.get<{ download_url: string }>(
    `/files/${fileObjectId}/download-url${search}`,
  );
}

export async function renameFile(
  fileObjectId: string,
  payload: { file_name: string },
): ApiResult<FileMetadata> {
  return apiClient.patch<FileMetadata>(`/files/${fileObjectId}`, payload);
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
