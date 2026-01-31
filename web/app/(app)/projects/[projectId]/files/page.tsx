"use client";

import { use, useRef, useState } from "react";
import Link from "next/link";
import { useProject } from "@/lib/queries/projects.queries";
import {
  useProjectFiles,
  useRenameFile,
  useDeleteFile,
} from "@/lib/queries/files.queries";
import { useSession } from "@/lib/providers/session-provider";
import {
  presignUpload,
  finalizeUpload,
  getFileDownloadUrl,
} from "@/lib/api/endpoints/files";
import { uploadViaPresign } from "@/lib/uploads/s3Upload";
import { Button } from "@/components/ui/button";
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
import {
  AlertCircle,
  RefreshCw,
  Upload,
  Download,
  Trash2,
  ArrowLeft,
  Pencil,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { routes } from "@/lib/routes";
import { format } from "date-fns";
import { formatFileSize } from "@/lib/format/fileSize";
import { toast } from "@/hooks/use-toast";
import { FileThumbnail } from "@/components/app/FileThumbnail";

export default function ProjectFilesPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = use(params);
  const { user } = useSession();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameFileId, setRenameFileId] = useState<string | null>(null);
  const [renameName, setRenameName] = useState("");

  const { data: projectResponse } = useProject(projectId);
  const project = projectResponse?.data;

  const {
    data: filesResponse,
    isLoading: filesLoading,
    isError: filesError,
    refetch: refetchFiles,
  } = useProjectFiles(projectId);
  const files = filesResponse?.data ?? [];
  const filesApiError = filesResponse?.error;

  const renameFile = useRenameFile({ projectId });
  const deleteFile = useDeleteFile({ projectId });

  const isOwner = user?.role === "OWNER";

  const openRename = (file: { id: string; original_filename: string }) => {
    setRenameFileId(file.id);
    setRenameName(file.original_filename);
    setRenameOpen(true);
  };

  const handleRenameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renameFileId || !renameName.trim()) return;
    const res = await renameFile.mutateAsync({
      fileObjectId: renameFileId,
      file_name: renameName.trim(),
    });
    if (res.error) {
      toast({
        variant: "destructive",
        title: "Rename failed",
        description: res.error.message,
      });
    } else {
      setRenameOpen(false);
      setRenameFileId(null);
      setRenameName("");
      toast({ title: "File renamed" });
    }
  };

  const handleUploadClick = () => fileInputRef.current?.click();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles?.length || !projectId) return;

    setUploading(true);
    let done = 0;
    let failed = 0;

    try {
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        try {
          const presignRes = await presignUpload({
            project_id: projectId,
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
            project_id: projectId,
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

  return (
    <div className="space-y-6">
      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent>
          <form onSubmit={handleRenameSubmit}>
            <DialogHeader>
              <DialogTitle>Rename file</DialogTitle>
              <DialogDescription>
                The new name will be used in the list and when downloading.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="rename-name">File name</Label>
                <Input
                  id="rename-name"
                  value={renameName}
                  onChange={(e) => setRenameName(e.target.value)}
                  placeholder="Document.pdf"
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setRenameOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={renameFile.isPending}>
                {renameFile.isPending ? "Saving…" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <div className="flex items-center gap-4">
        <Link href={routes.project.overview(projectId)}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Project Files</h1>
          <p className="text-muted-foreground">
            {project ? project.name : projectId}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4">
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

      {filesError || filesApiError ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>{filesApiError?.message ?? "Failed to load files"}</span>
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
      ) : files.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No files yet. Use Upload to add files to this project.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[52px]"> </TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Uploaded By</TableHead>
              <TableHead>Uploaded At</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {files.map((file) => (
              <TableRow key={file.id}>
                <TableCell className="w-0">
                  <FileThumbnail
                    fileId={file.id}
                    mimeType={file.mime_type}
                    fileName={file.original_filename}
                  />
                </TableCell>
                <TableCell className="font-medium">
                  {file.original_filename}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {file.mime_type}
                </TableCell>
                <TableCell>{formatFileSize(file.size_bytes)}</TableCell>
                <TableCell>{file.uploaded_by.full_name}</TableCell>
                <TableCell className="text-muted-foreground">
                  {format(new Date(file.created_at), "MMM d, yyyy HH:mm")}
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openRename(file)}
                      title="Rename"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDownload(file.id)}
                      title="Download"
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
