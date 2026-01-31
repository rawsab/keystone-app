"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDashboard } from "@/lib/queries/dashboard.queries";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  FolderKanban,
  FileText,
  Clock,
  AlertCircle,
  ArrowRight,
  AlertTriangle,
} from "lucide-react";
import { routes } from "@/lib/routes";
import { formatDistanceToNow } from "date-fns";

export default function DashboardPage() {
  const router = useRouter();
  const {
    data: dashboardResponse,
    isLoading,
    isError,
    refetch,
  } = useDashboard();

  const dashboard = dashboardResponse?.data;
  const error = dashboardResponse?.error;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome to Keystone construction management
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16 mb-2" />
              <Skeleton className="h-4 w-24" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16 mb-2" />
              <Skeleton className="h-4 w-24" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16 mb-2" />
              <Skeleton className="h-4 w-24" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (isError || error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome to Keystone construction management
          </p>
        </div>

        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>{error?.message || "Failed to load dashboard"}</span>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!dashboard) {
    return null;
  }

  const hasProjects = dashboard.total_projects_count > 0;
  const hasReports = dashboard.reports_this_week.total_count > 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome to Keystone construction management
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Projects</CardTitle>
            <FolderKanban className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dashboard.active_projects_count}
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              {dashboard.active_projects_count === 1
                ? "Active project"
                : "Active projects"}
              {dashboard.total_projects_count >
                dashboard.active_projects_count &&
                ` (${dashboard.total_projects_count} total)`}
            </p>
            <Link href={routes.app.projects}>
              <Button size="sm" variant="outline" className="w-full">
                View Projects
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Reports This Week
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dashboard.reports_this_week.total_count}
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              {dashboard.reports_this_week.submitted_count} submitted,{" "}
              {dashboard.reports_this_week.draft_count} draft
            </p>
            <Link href={routes.app.projects}>
              <Button size="sm" variant="outline" className="w-full">
                Open Projects
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Needs Attention
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {dashboard.needs_attention.stale_drafts_count > 0 ? (
              <>
                <div className="text-2xl font-bold text-orange-600">
                  {dashboard.needs_attention.stale_drafts_count}
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  Stale draft reports (48h+)
                </p>
                <Link href={routes.app.projects}>
                  <Button size="sm" variant="outline" className="w-full">
                    Review Drafts
                    <AlertTriangle className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </>
            ) : (
              <>
                <div className="text-2xl font-bold text-green-600">0</div>
                <p className="text-xs text-muted-foreground">
                  All reports up to date
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {hasProjects && dashboard.recent_projects.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Projects</CardTitle>
            <CardDescription>
              Recently updated projects you have access to
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dashboard.recent_projects.map((project) => (
                  <TableRow
                    key={project.id}
                    className="cursor-pointer"
                    onClick={() =>
                      router.push(routes.project.overview(project.id))
                    }
                  >
                    <TableCell className="font-medium">
                      {project.name}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          project.status === "ACTIVE" ? "default" : "secondary"
                        }
                      >
                        {project.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDistanceToNow(new Date(project.updated_at), {
                        addSuffix: true,
                      })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {hasReports && dashboard.recent_reports.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Reports</CardTitle>
            <CardDescription>
              Latest daily reports across your projects
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dashboard.recent_reports.map((report) => (
                  <TableRow
                    key={report.id}
                    className="cursor-pointer"
                    onClick={() =>
                      router.push(
                        routes.project.report(report.project_id, report.id),
                      )
                    }
                  >
                    <TableCell className="font-medium">
                      {report.project_name}
                    </TableCell>
                    <TableCell>
                      {new Date(report.report_date).toLocaleDateString(
                        "en-US",
                        {
                          month: "short",
                          day: "numeric",
                        },
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
                      {formatDistanceToNow(new Date(report.updated_at), {
                        addSuffix: true,
                      })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {!hasProjects && (
        <Card>
          <CardHeader>
            <CardTitle>Get Started</CardTitle>
            <CardDescription>
              Create your first project to start tracking daily reports
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href={routes.app.projects}>
              <Button>
                <FolderKanban className="mr-0 h-4 w-4" />
                Create Project
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
