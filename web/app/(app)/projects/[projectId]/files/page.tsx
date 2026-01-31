"use client";

import { use, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { useProject } from "@/lib/queries/projects.queries";
import {
  useProjectContents,
  useRenameFile,
  useDeleteFile,
  useRenameProjectFolder,
  useDeleteProjectFolder,
  useCreateProjectFolder,
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
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
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
import { downloadProjectFolderAsZip } from "@/lib/files/downloadFolderAsZip";
import type { FileMetadata, FolderListItem } from "@/lib/api/endpoints/files";

type PathSegment = { id: string | null; name: string };

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
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [path, setPath] = useState<PathSegment[]>([
    { id: null, name: "Project files" },
  ]);
  const [expandedFolderIds, setExpandedFolderIds] = useState<Set<string>>(
    new Set(),
  );
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [renameFolderOpen, setRenameFolderOpen] = useState(false);
  const [renameFolderId, setRenameFolderId] = useState<string | null>(null);
  const [renameFolderName, setRenameFolderName] = useState("");
  const [deleteFolderOpen, setDeleteFolderOpen] = useState(false);
  const [deleteFolderId, setDeleteFolderId] = useState<string | null>(null);
  const [deleteFolderDisplayName, setDeleteFolderDisplayName] = useState("");

  const { data: projectResponse } = useProject(projectId);
  const project = projectResponse?.data;

  const {
    data: contentsResponse,
    isLoading: contentsLoading,
    isError: contentsError,
    refetch: refetchContents,
  } = useProjectContents(projectId, currentFolderId);
  const raw = contentsResponse?.data;
  const contents = {
    folders: Array.isArray(raw?.folders) ? raw.folders : [],
    files: Array.isArray(raw?.files) ? raw.files : [],
  };
  const contentsApiError = contentsResponse?.error;

  const renameFile = useRenameFile({ projectId });
  const deleteFile = useDeleteFile({ projectId });
  const renameFolder = useRenameProjectFolder(projectId);
  const deleteFolder = useDeleteProjectFolder(projectId);
  const createFolder = useCreateProjectFolder(projectId);

  const isOwner = user?.role === "OWNER";

  const openRenameFolder = (folder: { id: string; name: string }) => {
    setRenameFolderId(folder.id);
    setRenameFolderName(folder.name);
    setRenameFolderOpen(true);
  };

  const handleRenameFolderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renameFolderId || !renameFolderName.trim()) return;
    const res = await renameFolder.mutateAsync({
      folderId: renameFolderId,
      name: renameFolderName.trim(),
    });
    if (res.error) {
      toast({
        variant: "destructive",
        title: "Rename failed",
        description: res.error.message,
      });
    } else {
      setRenameFolderOpen(false);
      setRenameFolderId(null);
      setRenameFolderName("");
      toast({ title: "Folder renamed" });
    }
  };

  const openDeleteFolder = (folder: { id: string; name: string }) => {
    setDeleteFolderId(folder.id);
    setDeleteFolderDisplayName(folder.name);
    setDeleteFolderOpen(true);
  };

  const handleDeleteFolderConfirm = async () => {
    if (!deleteFolderId) return;
    const res = await deleteFolder.mutateAsync(deleteFolderId);
    if (res.error) {
      toast({
        variant: "destructive",
        title: "Delete failed",
        description: res.error.message,
      });
    } else {
      setDeleteFolderOpen(false);
      setDeleteFolderId(null);
      setDeleteFolderDisplayName("");
      toast({ title: "Folder deleted" });
    }
  };

  const handleDownloadFolder = async (folder: { id: string; name: string }) => {
    try {
      toast({ title: "Preparing download…" });
      const count = await downloadProjectFolderAsZip(
        projectId,
        folder.id,
        folder.name,
      );
      if (count === 0) {
        toast({ title: "This folder is empty" });
      } else {
        toast({ title: "Download started" });
      }
    } catch {
      toast({
        variant: "destructive",
        title: "Download failed",
        description: "Could not create folder zip.",
      });
    }
  };

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

  const toggleFolderExpand = useCallback((folderId: string) => {
    setExpandedFolderIds((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) next.delete(folderId);
      else next.add(folderId);
      return next;
    });
  }, []);

  const navigateToFolder = useCallback((folder: FolderListItem) => {
    setCurrentFolderId(folder.id);
    setPath((prev) => [...prev, { id: folder.id, name: folder.name }]);
  }, []);

  const navigateToPath = useCallback(
    (index: number) => {
      const segment = path[index];
      setCurrentFolderId(segment.id);
      setPath((prev) => prev.slice(0, index + 1));
    },
    [path],
  );

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
            folder_id: currentFolderId ?? undefined,
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
            folder_id: currentFolderId ?? undefined,
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
        refetchContents();
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

  const handleNewFolderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newFolderName.trim();
    if (!name) return;
    const res = await createFolder.mutateAsync({
      name,
      parent_folder_id: currentFolderId ?? undefined,
    });
    if (res.error) {
      toast({
        variant: "destructive",
        title: "Create folder failed",
        description: res.error.message,
      });
    } else {
      setNewFolderOpen(false);
      setNewFolderName("");
      toast({ title: "Folder created" });
    }
  };

  const isEmpty =
    !contentsLoading &&
    contents.folders.length === 0 &&
    contents.files.length === 0;

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

      <Dialog open={newFolderOpen} onOpenChange={setNewFolderOpen}>
        <DialogContent>
          <form onSubmit={handleNewFolderSubmit}>
            <DialogHeader>
              <DialogTitle>New folder</DialogTitle>
              <DialogDescription>
                Create a folder in the current location.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="new-folder-name">Folder name</Label>
                <Input
                  id="new-folder-name"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="My folder"
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setNewFolderOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createFolder.isPending}>
                {createFolder.isPending ? "Creating…" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={renameFolderOpen} onOpenChange={setRenameFolderOpen}>
        <DialogContent>
          <form onSubmit={handleRenameFolderSubmit}>
            <DialogHeader>
              <DialogTitle>Rename folder</DialogTitle>
              <DialogDescription>
                Enter a new name for the folder.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="rename-folder-name">Folder name</Label>
                <Input
                  id="rename-folder-name"
                  value={renameFolderName}
                  onChange={(e) => setRenameFolderName(e.target.value)}
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setRenameFolderOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={renameFolder.isPending}>
                {renameFolder.isPending ? "Saving…" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteFolderOpen} onOpenChange={setDeleteFolderOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete folder</DialogTitle>
            <DialogDescription>
              Delete &quot;{deleteFolderDisplayName}&quot;? Contents will be
              moved to the parent folder. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteFolderOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteFolderConfirm}
              disabled={deleteFolder.isPending}
            >
              {deleteFolder.isPending ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
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
        <Button
          variant="outline"
          onClick={() => {
            setNewFolderName("");
            setNewFolderOpen(true);
          }}
        >
          <Folder className="mr-2 h-4 w-4" />
          New folder
        </Button>
      </div>

      {path.length > 1 && (
        <nav className="flex items-center gap-1 text-sm text-muted-foreground">
          {path.map((seg, i) => {
            const isCurrent = i === path.length - 1;
            return (
              <span key={seg.id ?? "root"}>
                {i > 0 && <span className="mx-1">/</span>}
                {isCurrent ? (
                  <span className="text-muted-foreground/70">{seg.name}</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => navigateToPath(i)}
                    className="hover:text-foreground underline-offset-2 hover:underline"
                  >
                    {seg.name}
                  </button>
                )}
              </span>
            );
          })}
        </nav>
      )}

      {contentsError || contentsApiError ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>
              {contentsApiError?.message ?? "Failed to load contents"}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetchContents()}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      {contentsLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : isEmpty ? (
        <p className="text-sm text-muted-foreground">
          This folder is empty. Use Upload or New folder to add content.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Uploaded By</TableHead>
              <TableHead>Uploaded At</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contents.folders.map((folder) => (
              <ExpandableFolderRow
                key={folder.id}
                projectId={projectId}
                folder={folder}
                depth={0}
                expandedFolderIds={expandedFolderIds}
                onToggleExpand={toggleFolderExpand}
                onNavigate={navigateToFolder}
                onDownload={handleDownload}
                onRename={openRename}
                onDelete={handleDelete}
                onRenameFolder={openRenameFolder}
                onDownloadFolder={handleDownloadFolder}
                onDeleteFolder={openDeleteFolder}
                isOwner={isOwner}
                deleteFile={deleteFile}
                deleteFolder={deleteFolder}
              />
            ))}
            {contents.files.map((file) => (
              <FileRow
                key={file.id}
                file={file}
                onDownload={handleDownload}
                onRename={openRename}
                onDelete={handleDelete}
                isOwner={isOwner}
                deleteFile={deleteFile}
              />
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

function ExpandableFolderRow({
  projectId,
  folder,
  depth,
  expandedFolderIds,
  onToggleExpand,
  onNavigate,
  onDownload,
  onRename,
  onDelete,
  onRenameFolder,
  onDownloadFolder,
  onDeleteFolder,
  isOwner,
  deleteFile,
  deleteFolder,
}: {
  projectId: string;
  folder: FolderListItem;
  depth: number;
  expandedFolderIds: Set<string>;
  onToggleExpand: (id: string) => void;
  onNavigate: (folder: FolderListItem) => void;
  onDownload: (id: string) => void;
  onRename: (file: { id: string; original_filename: string }) => void;
  onDelete: (id: string) => void;
  onRenameFolder: (folder: { id: string; name: string }) => void;
  onDownloadFolder: (folder: { id: string; name: string }) => void;
  onDeleteFolder: (folder: { id: string; name: string }) => void;
  isOwner: boolean;
  deleteFile: {
    mutateAsync: (id: string) => Promise<unknown>;
    isPending: boolean;
  };
  deleteFolder: {
    mutateAsync: (id: string) => Promise<unknown>;
    isPending: boolean;
  };
}) {
  const isExpanded = expandedFolderIds.has(folder.id);
  const { data: childContents } = useProjectContents(projectId, folder.id, {
    enabled: isExpanded,
  });
  const children = childContents?.data ?? { folders: [], files: [] };
  const paddingLeft = depth * 24;

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <TableRow
            className="cursor-pointer select-none"
            onClick={(e) => {
              if (e.detail === 2) {
                onNavigate(folder);
              } else {
                onToggleExpand(folder.id);
              }
            }}
          >
            <TableCell
              className="font-medium"
              style={{ paddingLeft: 12 + paddingLeft }}
            >
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center gap-1">
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  )}
                  {isExpanded ? (
                    <FolderOpen className="h-5 w-5 shrink-0 text-amber-600" />
                  ) : (
                    <Folder className="h-5 w-5 shrink-0 text-amber-600" />
                  )}
                </div>
                <span>{folder.name}</span>
              </div>
            </TableCell>
            <TableCell className="text-muted-foreground">—</TableCell>
            <TableCell>{formatFileSize(folder.total_size_bytes)}</TableCell>
            <TableCell>—</TableCell>
            <TableCell className="text-muted-foreground">—</TableCell>
            <TableCell>
              <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRenameFolder(folder)}
                  title="Rename"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDownloadFolder(folder)}
                  title="Download"
                >
                  <Download className="h-4 w-4" />
                </Button>
                {isOwner && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDeleteFolder(folder)}
                    disabled={deleteFolder.isPending}
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>
            </TableCell>
          </TableRow>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem
            onSelect={(e) => {
              e.preventDefault();
              onRenameFolder(folder);
            }}
          >
            <Pencil className="h-4 w-4" />
            Edit name
          </ContextMenuItem>
          <ContextMenuItem
            onSelect={(e) => {
              e.preventDefault();
              onDownloadFolder(folder);
            }}
          >
            <Download className="h-4 w-4" />
            Download
          </ContextMenuItem>
          {isOwner && (
            <ContextMenuItem
              variant="destructive"
              onSelect={(e) => {
                e.preventDefault();
                onDeleteFolder(folder);
              }}
              disabled={deleteFolder.isPending}
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </ContextMenuItem>
          )}
        </ContextMenuContent>
      </ContextMenu>
      {isExpanded &&
        (children.folders.length > 0 || children.files.length > 0) && (
          <>
            {children.folders.map((childFolder) => (
              <ExpandableFolderRow
                key={childFolder.id}
                projectId={projectId}
                folder={childFolder}
                depth={depth + 1}
                expandedFolderIds={expandedFolderIds}
                onToggleExpand={onToggleExpand}
                onNavigate={onNavigate}
                onDownload={onDownload}
                onRename={onRename}
                onDelete={onDelete}
                onRenameFolder={onRenameFolder}
                onDownloadFolder={onDownloadFolder}
                onDeleteFolder={onDeleteFolder}
                isOwner={isOwner}
                deleteFile={deleteFile}
                deleteFolder={deleteFolder}
              />
            ))}
            {children.files.map((file) => (
              <FileRow
                key={file.id}
                file={file}
                depth={depth + 1}
                onDownload={onDownload}
                onRename={onRename}
                onDelete={onDelete}
                isOwner={isOwner}
                deleteFile={deleteFile}
              />
            ))}
          </>
        )}
    </>
  );
}

function FileRow({
  file,
  depth = 0,
  onDownload,
  onRename,
  onDelete,
  isOwner,
  deleteFile,
}: {
  file: FileMetadata;
  depth?: number;
  onDownload: (id: string) => void;
  onRename: (file: { id: string; original_filename: string }) => void;
  onDelete: (id: string) => void;
  isOwner: boolean;
  deleteFile: {
    mutateAsync: (id: string) => Promise<unknown>;
    isPending: boolean;
  };
}) {
  const paddingLeft = depth * 24;
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <TableRow>
          <TableCell
            className="font-medium"
            style={{ paddingLeft: 12 + paddingLeft }}
          >
            <div className="flex items-center gap-2">
              <FileThumbnail
                fileId={file.id}
                mimeType={file.mime_type}
                fileName={file.original_filename}
              />
              <span>{file.original_filename}</span>
            </div>
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
                onClick={() => onRename(file)}
                title="Rename"
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDownload(file.id)}
                title="Download"
              >
                <Download className="h-4 w-4" />
              </Button>
              {isOwner && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(file.id)}
                  disabled={deleteFile.isPending}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              )}
            </div>
          </TableCell>
        </TableRow>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem
          onSelect={(e) => {
            e.preventDefault();
            onRename(file);
          }}
        >
          <Pencil className="h-4 w-4" />
          Edit name
        </ContextMenuItem>
        <ContextMenuItem
          onSelect={(e) => {
            e.preventDefault();
            onDownload(file.id);
          }}
        >
          <Download className="h-4 w-4" />
          Download
        </ContextMenuItem>
        {isOwner && (
          <ContextMenuItem
            variant="destructive"
            onSelect={(e) => {
              e.preventDefault();
              onDelete(file.id);
            }}
            disabled={deleteFile.isPending}
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </ContextMenuItem>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}
