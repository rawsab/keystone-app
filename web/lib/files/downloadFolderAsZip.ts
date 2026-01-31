import JSZip from "jszip";
import {
  listProjectContents,
  listCompanyContents,
  getFileDownloadUrl,
} from "@/lib/api/endpoints/files";
import type { FileMetadata } from "@/lib/api/endpoints/files";

type FileEntry = { fileId: string; path: string; filename: string };

async function collectProjectFiles(
  projectId: string,
  folderId: string,
  pathPrefix: string,
): Promise<FileEntry[]> {
  const res = await listProjectContents(projectId, folderId);
  if (res.error || !res.data) return [];
  const entries: FileEntry[] = [];
  for (const file of res.data.files as FileMetadata[]) {
    entries.push({
      fileId: file.id,
      path: pathPrefix + file.original_filename,
      filename: file.original_filename,
    });
  }
  for (const sub of res.data.folders) {
    const subEntries = await collectProjectFiles(
      projectId,
      sub.id,
      pathPrefix + sub.name + "/",
    );
    entries.push(...subEntries);
  }
  return entries;
}

async function collectCompanyFiles(
  folderId: string,
  pathPrefix: string,
): Promise<FileEntry[]> {
  const res = await listCompanyContents(folderId);
  if (res.error || !res.data) return [];
  const entries: FileEntry[] = [];
  for (const file of res.data.files) {
    entries.push({
      fileId: file.id,
      path: pathPrefix + file.file_name,
      filename: file.file_name,
    });
  }
  for (const sub of res.data.folders) {
    const subEntries = await collectCompanyFiles(
      sub.id,
      pathPrefix + sub.name + "/",
    );
    entries.push(...subEntries);
  }
  return entries;
}

/** Returns number of files included in the zip, or 0 if folder is empty. */
export async function downloadProjectFolderAsZip(
  projectId: string,
  folderId: string,
  folderName: string,
): Promise<number> {
  const entries = await collectProjectFiles(projectId, folderId, "");
  if (entries.length === 0) return 0;
  const zip = new JSZip();
  for (const { fileId, path } of entries) {
    const urlRes = await getFileDownloadUrl(fileId);
    if (urlRes.error || !urlRes.data?.download_url) continue;
    const response = await fetch(urlRes.data.download_url);
    const blob = await response.blob();
    zip.file(path, blob);
  }
  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${folderName || "folder"}.zip`;
  a.click();
  URL.revokeObjectURL(url);
  return entries.length;
}

/** Returns number of files included in the zip, or 0 if folder is empty. */
export async function downloadCompanyFolderAsZip(
  folderId: string,
  folderName: string,
): Promise<number> {
  const entries = await collectCompanyFiles(folderId, "");
  if (entries.length === 0) return 0;
  const zip = new JSZip();
  for (const { fileId, path } of entries) {
    const urlRes = await getFileDownloadUrl(fileId);
    if (urlRes.error || !urlRes.data?.download_url) continue;
    const response = await fetch(urlRes.data.download_url);
    const blob = await response.blob();
    zip.file(path, blob);
  }
  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${folderName || "folder"}.zip`;
  a.click();
  URL.revokeObjectURL(url);
  return entries.length;
}
