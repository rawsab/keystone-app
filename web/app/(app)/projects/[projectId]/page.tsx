"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useProject } from "@/lib/queries/projects.queries";
import { useDailyReportsList } from "@/lib/queries/dailyReports.queries";
import { useProjectMembers } from "@/lib/queries/members.queries";
import { useProjectFiles } from "@/lib/queries/files.queries";
import { getFileDownloadUrl } from "@/lib/api/endpoints/files";
import { CreateDailyReportDialog } from "@/components/app/daily-reports/CreateDailyReportDialog";
import { EditProjectDialog } from "@/components/app/projects/EditProjectDialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
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
  ExternalLink,
  Plus,
  Pencil,
  FolderOpen,
  Download,
} from "lucide-react";
import { routes } from "@/lib/routes";
import { format, formatDistanceToNow } from "date-fns";
import { Hash, Building2, MapPin, Clock } from "lucide-react";
import { formatFileSize } from "@/lib/format/fileSize";
import { toast } from "@/hooks/use-toast";

export default function ProjectDashboardPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const router = useRouter();
  const { projectId } = use(params);

  const {
    data: projectResponse,
    isLoading: projectLoading,
    isError: projectError,
    refetch: refetchProject,
  } = useProject(projectId);

  const {
    data: reportsResponse,
    isLoading: reportsLoading,
    isError: reportsError,
    refetch: refetchReports,
  } = useDailyReportsList(projectId);

  const {
    data: membersResponse,
    isLoading: membersLoading,
    isError: membersError,
    refetch: refetchMembers,
  } = useProjectMembers(projectId);

  const project = projectResponse?.data;
  const projectApiError = projectResponse?.error;

  const allReports = reportsResponse?.data || [];
  const recentReports = allReports.slice(0, 5);
  const reportsApiError = reportsResponse?.error;

  const members = membersResponse?.data || [];
  const membersApiError = membersResponse?.error;

  const {
    data: filesResponse,
    isLoading: filesLoading,
    isError: filesError,
    refetch: refetchFiles,
  } = useProjectFiles(projectId);
  const allFiles = filesResponse?.data ?? [];
  const recentFiles = allFiles.slice(0, 5);
  const filesApiError = filesResponse?.error;

  const [editProjectOpen, setEditProjectOpen] = useState(false);

  const handleReportClick = (reportId: string) => {
    router.push(routes.project.report(projectId, reportId));
  };

  const handleFileDownload = async (fileObjectId: string) => {
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

  return (
    <div className="space-y-6">
      {projectLoading && (
        <>
          <div className="space-y-2">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-4 w-32" />
          </div>
        </>
      )}

      {!projectLoading && (projectError || projectApiError) && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>{projectApiError?.message || "Failed to load project"}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetchProject()}
              className="ml-4"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {!projectLoading && !projectError && !projectApiError && project && (
        <>
          <EditProjectDialog
            projectId={projectId}
            open={editProjectOpen}
            onOpenChange={setEditProjectOpen}
          />

          <div>
            <h1 className="text-3xl font-bold">{project.name}</h1>
            <div className="mt-2 flex items-center gap-2">
              <Badge
                variant={project.status === "ACTIVE" ? "default" : "secondary"}
              >
                {project.status}
              </Badge>
            </div>
          </div>

          <Card>
            <CardHeader>
              <div className="flex flex-row items-center justify-between gap-2">
                <CardTitle>Project Information</CardTitle>
                <div className="flex gap-2">
                  <Link href={routes.project.files(projectId)}>
                    <Button variant="outline" size="sm" className="gap-2">
                      <FolderOpen className="h-4 w-4" />
                      Files
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditProjectOpen(true)}
                    className="gap-2"
                  >
                    <Pencil className="h-4 w-4" />
                    Edit project
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {project.project_number && (
                <div className="flex items-center gap-2">
                  <Hash className="mr-0 h-4 w-4" />
                  <span className="text-sm font-medium">Project ID: </span>
                  <span className="text-sm text-muted-foreground font-mono">
                    {project.project_number}
                  </span>
                </div>
              )}
              {project.company_name && (
                <div className="flex items-center gap-2">
                  <Building2 className="mr-0 h-4 w-4" />
                  <span className="text-sm font-medium">Company: </span>
                  <span className="text-sm text-muted-foreground">
                    {project.company_name}
                  </span>
                </div>
              )}
              {project.address_display && (
                <div className="flex items-center gap-2">
                  <MapPin className="mr-0 h-4 w-4" />
                  <span className="text-sm font-medium">Address: </span>
                  <span className="text-sm text-muted-foreground">
                    {project.address_display}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Clock className="mr-0 h-4 w-4" />
                <span className="text-sm font-medium">Last Updated: </span>
                <span className="text-sm text-muted-foreground">
                  {formatDistanceToNow(new Date(project.updated_at), {
                    addSuffix: true,
                  })}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <CardTitle>Recent Daily Reports</CardTitle>
                  <CardDescription>
                    {allReports.length > 0
                      ? `Showing ${Math.min(5, allReports.length)} of ${allReports.length} reports`
                      : "No reports yet"}
                  </CardDescription>
                </div>
                {allReports.length > 0 && (
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <Link
                      href={routes.project.reports(projectId)}
                      className="w-full sm:w-auto"
                    >
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full sm:w-auto"
                      >
                        View All Reports
                        <ExternalLink className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>

                    <CreateDailyReportDialog
                      projectId={projectId}
                      trigger={
                        <Button size="sm" className="w-full sm:w-auto">
                          <Plus className="mr-0 h-4 w-4" />
                          Create Report
                        </Button>
                      }
                    />
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {reportsLoading && (
                <div className="space-y-3">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              )}

              {!reportsLoading && (reportsError || reportsApiError) && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="flex items-center justify-between">
                    <span>
                      {reportsApiError?.message || "Failed to load reports"}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => refetchReports()}
                      className="ml-4"
                    >
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Retry
                    </Button>
                  </AlertDescription>
                </Alert>
              )}

              {!reportsLoading &&
                !reportsError &&
                !reportsApiError &&
                recentReports.length === 0 && (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      No daily reports yet. Reports will appear here once
                      created.
                    </p>
                    <CreateDailyReportDialog
                      projectId={projectId}
                      trigger={
                        <Button size="sm" variant="outline">
                          <Plus className="mr-0 h-4 w-4" />
                          Create Report
                        </Button>
                      }
                    />
                  </div>
                )}

              {!reportsLoading &&
                !reportsError &&
                !reportsApiError &&
                recentReports.length > 0 && (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created By</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentReports.map((report) => (
                        <TableRow
                          key={report.id}
                          onClick={() => handleReportClick(report.id)}
                          className="cursor-pointer"
                        >
                          <TableCell className="font-medium">
                            {format(
                              new Date(report.report_date),
                              "MMM d, yyyy",
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                report.status === "SUBMITTED"
                                  ? "default"
                                  : "secondary"
                              }
                            >
                              {report.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {report.created_by.full_name}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Project Members</CardTitle>
              <CardDescription>
                {members.length} {members.length === 1 ? "member" : "members"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {membersLoading && (
                <div className="space-y-3">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              )}

              {!membersLoading && (membersError || membersApiError) && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="flex items-center justify-between">
                    <span>
                      {membersApiError?.message || "Failed to load members"}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => refetchMembers()}
                      className="ml-4"
                    >
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Retry
                    </Button>
                  </AlertDescription>
                </Alert>
              )}

              {!membersLoading &&
                !membersError &&
                !membersApiError &&
                members.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No members are currently assigned to this project.
                  </p>
                )}

              {!membersLoading &&
                !membersError &&
                !membersApiError &&
                members.length > 0 && (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Role</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {members.map((member) => (
                        <TableRow key={member.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">
                                {member.full_name}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {member.email}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              {member.project_role}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle>Project Files</CardTitle>
                  <CardDescription>
                    {allFiles.length > 0
                      ? `${recentFiles.length} of ${allFiles.length} files shown`
                      : "Files uploaded to this project"}
                  </CardDescription>
                </div>
                <Link href={routes.project.files(projectId)}>
                  <Button variant="outline" size="sm" className="gap-2">
                    <FolderOpen className="h-4 w-4" />
                    View All Files
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {filesLoading && (
                <div className="space-y-3">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              )}

              {!filesLoading && (filesError || filesApiError) && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="flex items-center justify-between">
                    <span>
                      {filesApiError?.message ?? "Failed to load files"}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => refetchFiles()}
                      className="ml-4"
                    >
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Retry
                    </Button>
                  </AlertDescription>
                </Alert>
              )}

              {!filesLoading &&
                !filesError &&
                !filesApiError &&
                recentFiles.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No files yet. Go to Project Files to upload.
                  </p>
                )}

              {!filesLoading &&
                !filesError &&
                !filesApiError &&
                recentFiles.length > 0 && (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Size</TableHead>
                        <TableHead>Uploaded</TableHead>
                        <TableHead className="w-[80px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentFiles.map((file) => (
                        <TableRow key={file.id}>
                          <TableCell className="font-medium">
                            {file.original_filename}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {formatFileSize(file.size_bytes)}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {formatDistanceToNow(new Date(file.created_at), {
                              addSuffix: true,
                            })}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleFileDownload(file.id)}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
