"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useProject } from "@/lib/queries/projects.queries";
import { useDailyReportsList } from "@/lib/queries/dailyReports.queries";
import { useProjectMembers } from "@/lib/queries/members.queries";
import { CreateDailyReportDialog } from "@/components/app/daily-reports/CreateDailyReportDialog";
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
import { AlertCircle, RefreshCw, ExternalLink, Plus } from "lucide-react";
import { routes } from "@/lib/routes";
import { format, formatDistanceToNow } from "date-fns";

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

  const handleReportClick = (reportId: string) => {
    router.push(routes.project.report(projectId, reportId));
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
          <div>
            <h1 className="text-3xl font-bold">{project.name}</h1>
            <div className="mt-2 flex items-center gap-2">
              <Badge
                variant={project.status === "ACTIVE" ? "default" : "secondary"}
              >
                {project.status}
              </Badge>
              {project.location && (
                <span className="text-sm text-muted-foreground">
                  {project.location}
                </span>
              )}
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Project Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {project.project_number && (
                <div>
                  <span className="text-sm font-medium">Project Number: </span>
                  <span className="text-sm text-muted-foreground font-mono">
                    {project.project_number}
                  </span>
                </div>
              )}
              {project.company_name && (
                <div>
                  <span className="text-sm font-medium">Company: </span>
                  <span className="text-sm text-muted-foreground">
                    {project.company_name}
                  </span>
                </div>
              )}
              {project.address_display && (
                <div>
                  <span className="text-sm font-medium">Address: </span>
                  <span className="text-sm text-muted-foreground">
                    {project.address_display}
                  </span>
                </div>
              )}
              {project.location && (
                <div>
                  <span className="text-sm font-medium">
                    Location (Legacy):{" "}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {project.location}
                  </span>
                </div>
              )}
              <div>
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
        </>
      )}
    </div>
  );
}
