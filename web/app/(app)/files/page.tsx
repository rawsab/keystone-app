"use client";

import { useRef, useState, useMemo } from "react";
import { useCompanyFiles, useDeleteFile } from "@/lib/queries/files.queries";
import { useSession } from "@/lib/providers/session-provider";
import {
  presignUpload,
  finalizeUpload,
  getFileDownloadUrl,
} from "@/lib/api/endpoints/files";
import { uploadViaPresign } from "@/lib/uploads/s3Upload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AlertCircle, RefreshCw, Upload, Download, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { formatFileSize } from "@/lib/format/fileSize";
import { toast } from "@/hooks/use-toast";
import type { CompanyFileListItem } from "@/lib/api/endpoints/files";
import { FileThumbnail } from "@/components/app/FileThumbnail";

type SortField =
  | "file_name"
  | "size_bytes"
  | "created_at"
  | "uploaded_by"
  | "project_name";
type SortDir = "asc" | "desc";

export default function DocumentsPage() {
  const { user } = useSession();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("created_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const {
    data: response,
    isLoading: filesLoading,
    isError: filesError,
    refetch: refetchFiles,
  } = useCompanyFiles();
  const files = response?.data ?? [];
  const filesApiError = response?.error;

  const deleteFile = useDeleteFile();
  const isOwner = user?.role === "OWNER";

  const filtered = useMemo(() => {
    if (!search.trim()) return files;
    const q = search.trim().toLowerCase();
    return files.filter((f) => f.file_name.toLowerCase().includes(q));
  }, [files, search]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "file_name":
          cmp = a.file_name.localeCompare(b.file_name);
          break;
        case "size_bytes":
          cmp = a.size_bytes - b.size_bytes;
          break;
        case "created_at":
          cmp =
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        case "uploaded_by":
          cmp = a.uploaded_by.full_name.localeCompare(b.uploaded_by.full_name);
          break;
        case "project_name":
          cmp = (a.project_name ?? "").localeCompare(b.project_name ?? "");
          break;
        default:
          return 0;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [filtered, sortField, sortDir]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const handleUploadClick = () => fileInputRef.current?.click();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles?.length) return;

    setUploading(true);
    let done = 0;
    let failed = 0;

    try {
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        try {
          const presignRes = await presignUpload({
            original_filename: file.name,
            mime_type: file.type || "application/octet-stream",
            size_bytes: file.size,
          });
          if (presignRes.error || !presignRes.data) {
            failed++;
            continue;
          }
          const { upload_url, object_key } = presignRes.data;
          await uploadViaPresign(upload_url, file);
          const finalizeRes = await finalizeUpload({
            object_key,
            original_filename: file.name,
            mime_type: file.type || "application/octet-stream",
            size_bytes: file.size,
          });
          if (finalizeRes.error) failed++;
          else done++;
        } catch {
          failed++;
        }
      }

      if (done > 0) {
        refetchFiles();
        toast({
          title: "Upload complete",
          description: `${done} file(s) uploaded${failed > 0 ? `, ${failed} failed` : ""}.`,
        });
      }
      if (failed > 0 && done === 0) {
        toast({
          variant: "destructive",
          title: "Upload failed",
          description: "Could not upload one or more files.",
        });
      }
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleDownload = async (fileObjectId: string) => {
    const res = await getFileDownloadUrl(fileObjectId);
    if (res.data?.download_url) {
      window.open(res.data.download_url, "_blank");
    } else {
      toast({
        variant: "destructive",
        title: "Download failed",
        description: res.error?.message ?? "Could not get download link.",
      });
    }
  };

  const handleDelete = async (fileObjectId: string) => {
    const res = await deleteFile.mutateAsync(fileObjectId);
    if (res.error) {
      toast({
        variant: "destructive",
        title: "Delete failed",
        description: res.error.message,
      });
    } else {
      toast({ title: "File deleted" });
    }
  };

  const Th = ({
    field,
    children,
  }: {
    field: SortField;
    children: React.ReactNode;
  }) => (
    <TableHead>
      <Button
        variant="ghost"
        size="sm"
        className="-ml-2 h-8 font-medium"
        onClick={() => toggleSort(field)}
      >
        {children}
        {sortField === field && (sortDir === "asc" ? " ↑" : " ↓")}
      </Button>
    </TableHead>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Documents</h1>
        <p className="text-muted-foreground">Company-wide files and uploads</p>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Input
          placeholder="Search by file name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleFileChange}
          />
          <Button onClick={handleUploadClick} disabled={uploading}>
            <Upload className="mr-2 h-4 w-4" />
            {uploading ? "Uploading…" : "Upload"}
          </Button>
        </div>
      </div>

      {filesError || filesApiError ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>{filesApiError?.message ?? "Failed to load documents"}</span>
            <Button variant="outline" size="sm" onClick={() => refetchFiles()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      {filesLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : sorted.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {filtered.length === 0 && files.length > 0
            ? "No documents match your search."
            : "No documents yet. Use Upload to add files."}
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[52px]"> </TableHead>
              <Th field="file_name">Name</Th>
              <TableHead>Type</TableHead>
              <Th field="size_bytes">Size</Th>
              <Th field="uploaded_by">Uploaded By</Th>
              <Th field="created_at">Uploaded At</Th>
              <Th field="project_name">Project</Th>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((file: CompanyFileListItem) => (
              <TableRow key={file.id}>
                <TableCell className="w-0">
                  <FileThumbnail
                    fileId={file.id}
                    mimeType={file.mime_type}
                    fileName={file.file_name}
                  />
                </TableCell>
                <TableCell className="font-medium">{file.file_name}</TableCell>
                <TableCell className="text-muted-foreground">
                  {file.mime_type}
                </TableCell>
                <TableCell>{formatFileSize(file.size_bytes)}</TableCell>
                <TableCell>{file.uploaded_by.full_name}</TableCell>
                <TableCell className="text-muted-foreground">
                  {format(new Date(file.created_at), "MMM d, yyyy HH:mm")}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {file.project_name ?? "—"}
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDownload(file.id)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    {isOwner && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(file.id)}
                        disabled={deleteFile.isPending}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
