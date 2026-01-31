"use client";

import { useRef, useState, useMemo, useCallback } from "react";
import {
  useCompanyContents,
  useRenameFile,
  useDeleteFile,
  useRenameCompanyFolder,
  useDeleteCompanyFolder,
  useCreateCompanyFolder,
} from "@/lib/queries/files.queries";
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
import {
  AlertCircle,
  RefreshCw,
  Upload,
  Download,
  Trash2,
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
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { formatFileSize } from "@/lib/format/fileSize";
import { toast } from "@/hooks/use-toast";
import type {
  CompanyFileListItem,
  FolderListItem,
} from "@/lib/api/endpoints/files";
import { FileThumbnail } from "@/components/app/FileThumbnail";
import { downloadCompanyFolderAsZip } from "@/lib/files/downloadFolderAsZip";

type SortField =
  | "file_name"
  | "size_bytes"
  | "created_at"
  | "uploaded_by"
  | "project_name";
type SortDir = "asc" | "desc";
type PathSegment = { id: string | null; name: string };

export default function DocumentsPage() {
  const { user } = useSession();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("created_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [path, setPath] = useState<PathSegment[]>([
    { id: null, name: "Documents" },
  ]);
  const [expandedFolderIds, setExpandedFolderIds] = useState<Set<string>>(
    new Set(),
  );
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameFileId, setRenameFileId] = useState<string | null>(null);
  const [renameName, setRenameName] = useState("");
  const [renameFolderOpen, setRenameFolderOpen] = useState(false);
  const [renameFolderId, setRenameFolderId] = useState<string | null>(null);
  const [renameFolderName, setRenameFolderName] = useState("");
  const [deleteFolderOpen, setDeleteFolderOpen] = useState(false);
  const [deleteFolderId, setDeleteFolderId] = useState<string | null>(null);
  const [deleteFolderDisplayName, setDeleteFolderDisplayName] = useState("");

  const {
    data: response,
    isLoading: contentsLoading,
    isError: contentsError,
    refetch: refetchContents,
  } = useCompanyContents(currentFolderId);
  const raw = response?.data;
  const contents = {
    folders: Array.isArray(raw?.folders) ? raw.folders : [],
    files: Array.isArray(raw?.files) ? raw.files : [],
  };
  const contentsApiError = response?.error;

  const renameFile = useRenameFile();
  const deleteFile = useDeleteFile();
  const renameFolder = useRenameCompanyFolder();
  const deleteFolder = useDeleteCompanyFolder();
  const createFolder = useCreateCompanyFolder();
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
      const count = await downloadCompanyFolderAsZip(folder.id, folder.name);
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

  const openRename = (file: { id: string; file_name: string }) => {
    setRenameFileId(file.id);
    setRenameName(file.file_name);
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

  const filtered = useMemo(() => {
    if (!search.trim()) return contents.files;
    const q = search.trim().toLowerCase();
    return contents.files.filter((f) => f.file_name.toLowerCase().includes(q));
  }, [contents.files, search]);

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
    if (!selectedFiles?.length) return;

    setUploading(true);
    let done = 0;
    let failed = 0;

    try {
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        try {
          const presignRes = await presignUpload({
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

  const isEmpty =
    !contentsLoading &&
    contents.folders.length === 0 &&
    contents.files.length === 0;

  return (
    <div className="space-y-6">
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

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent>
          <form onSubmit={handleRenameSubmit}>
            <DialogHeader>
              <DialogTitle>Rename file</DialogTitle>
              <DialogDescription>
                Enter a new name for the file.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="rename-name">File name</Label>
                <Input
                  id="rename-name"
                  value={renameName}
                  onChange={(e) => setRenameName(e.target.value)}
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
              {contentsApiError?.message ?? "Failed to load documents"}
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
            {contents.folders.map((folder) => (
              <CompanyExpandableFolderRow
                key={folder.id}
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
            {sorted.map((file: CompanyFileListItem) => (
              <CompanyFileRow
                key={file.id}
                file={file}
                depth={0}
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

function CompanyFileRow({
  file,
  depth = 0,
  onDownload,
  onRename,
  onDelete,
  isOwner,
  deleteFile,
}: {
  file: CompanyFileListItem;
  depth?: number;
  onDownload: (id: string) => void;
  onRename: (file: { id: string; file_name: string }) => void;
  onDelete: (id: string) => void;
  isOwner: boolean;
  deleteFile: {
    mutateAsync: (id: string) => Promise<unknown>;
    isPending: boolean;
  };
}) {
  const paddingLeft = 12 + depth * 24;
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <TableRow>
          <TableCell className="font-medium" style={{ paddingLeft }}>
            <div className="flex items-center gap-2">
              <FileThumbnail
                fileId={file.id}
                mimeType={file.mime_type}
                fileName={file.file_name}
              />
              <span>{file.file_name}</span>
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
          <TableCell className="text-muted-foreground">
            {file.project_name ?? "—"}
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

function CompanyExpandableFolderRow({
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
  folder: FolderListItem;
  depth: number;
  expandedFolderIds: Set<string>;
  onToggleExpand: (id: string) => void;
  onNavigate: (folder: FolderListItem) => void;
  onDownload: (id: string) => void;
  onRename: (file: { id: string; file_name: string }) => void;
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
  const { data: childContents } = useCompanyContents(folder.id, {
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
              <CompanyExpandableFolderRow
                key={childFolder.id}
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
              <CompanyFileRow
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
