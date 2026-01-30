import { useState, useRef } from "react";
import {
  useUploadAndAttach,
  useDeleteAttachment,
} from "@/lib/queries/attachments.queries";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Upload, Trash2, FileIcon, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Attachment {
  id: string;
  original_filename: string;
  mime_type: string;
  size_bytes: number;
}

interface AttachmentsSectionProps {
  reportId: string;
  projectId: string;
  attachments: Attachment[];
  isReadOnly: boolean;
}

export function AttachmentsSection({
  reportId,
  projectId,
  attachments,
  isReadOnly,
}: AttachmentsSectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [deleteTarget, setDeleteTarget] = useState<Attachment | null>(null);

  const uploadMutation = useUploadAndAttach(reportId, projectId);
  const deleteMutation = useDeleteAttachment(reportId, projectId);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    uploadMutation.mutate(file, {
      onSuccess: () => {
        toast({
          title: "File uploaded",
          description: `"${file.name}" has been attached successfully.`,
        });
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      },
      onError: (error) => {
        toast({
          title: "Upload failed",
          description: error instanceof Error ? error.message : "Unknown error",
          variant: "destructive",
        });
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      },
    });
  };

  const handleDelete = () => {
    if (!deleteTarget) return;

    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast({
          title: "File removed",
          description: `"${deleteTarget.original_filename}" has been removed.`,
        });
        setDeleteTarget(null);
      },
      onError: (error) => {
        toast({
          title: "Delete failed",
          description: error instanceof Error ? error.message : "Unknown error",
          variant: "destructive",
        });
        setDeleteTarget(null);
      },
    });
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Attachments</CardTitle>
          <CardDescription>
            {attachments.length === 0
              ? "No files attached"
              : `${attachments.length} file(s) attached`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {uploadMutation.isError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Failed to upload file. Please try again.
              </AlertDescription>
            </Alert>
          )}

          {attachments.length > 0 && (
            <div className="space-y-2">
              {attachments.map((attachment) => (
                <div
                  key={attachment.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <FileIcon className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">
                        {attachment.original_filename}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(attachment.size_bytes)}
                      </p>
                    </div>
                  </div>
                  {!isReadOnly && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteTarget(attachment)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}

          {!isReadOnly && (
            <div>
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileSelect}
                disabled={uploadMutation.isPending}
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload">
                <Button
                  type="button"
                  variant="outline"
                  disabled={uploadMutation.isPending}
                  className="w-full"
                  onClick={() => fileInputRef.current?.click()}
                  asChild
                >
                  <span>
                    {uploadMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        Upload File
                      </>
                    )}
                  </span>
                </Button>
              </label>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete attachment?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove &quot;
              {deleteTarget?.original_filename}&quot;? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
