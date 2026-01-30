"use client";

import Link from "next/link";
import { useProjectsList } from "@/lib/queries/projects.queries";
import { CreateProjectDialog } from "@/components/app/projects/CreateProjectDialog";
import { HealthCheck } from "@/components/app/HealthCheck";
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
import {
  FolderKanban,
  FileText,
  Clock,
  AlertCircle,
  ArrowRight,
} from "lucide-react";
import { routes } from "@/lib/routes";

export default function DashboardPage() {
  const {
    data: projectsResponse,
    isLoading: projectsLoading,
    isError: projectsError,
    refetch: refetchProjects,
  } = useProjectsList();

  const projects = projectsResponse?.data || [];
  const projectsApiError = projectsResponse?.error;

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
            {projectsLoading ? (
              <>
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-4 w-32" />
              </>
            ) : projectsError || projectsApiError ? (
              <div className="space-y-3">
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    {projectsApiError?.message || "Failed to load projects"}
                  </AlertDescription>
                </Alert>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => refetchProjects()}
                  className="w-full"
                >
                  Retry
                </Button>
              </div>
            ) : projects.length === 0 ? (
              <div className="space-y-3">
                <div className="text-2xl font-bold">0</div>
                <p className="text-xs text-muted-foreground">
                  Create your first project to get started
                </p>
                <CreateProjectDialog />
              </div>
            ) : (
              <>
                <div className="text-2xl font-bold">{projects.length}</div>
                <p className="text-xs text-muted-foreground mb-3">
                  {projects.length === 1 ? "Active project" : "Active projects"}
                </p>
                <Link href={routes.app.projects}>
                  <Button size="sm" variant="outline" className="w-full">
                    View Projects
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Daily Reports</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <CardDescription className="mb-4">
              Reports are managed per project. Select a project to view its
              daily reports.
            </CardDescription>
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
              Pending Actions
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">-</div>
            <p className="text-xs text-muted-foreground">
              Activity tracking coming soon
            </p>
          </CardContent>
        </Card>

        <HealthCheck />
      </div>
    </div>
  );
}
