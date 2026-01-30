"use client";

import { useRouter } from "next/navigation";
import { useProjectsList } from "@/lib/queries/projects.queries";
import { useSession } from "@/lib/providers/session-provider";
import { CreateProjectDialog } from "@/components/app/projects/CreateProjectDialog";
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
import { AlertCircle, RefreshCw } from "lucide-react";
import { routes } from "@/lib/routes";
import { formatDistanceToNow } from "date-fns";

export default function ProjectsPage() {
  const router = useRouter();
  const { user } = useSession();
  const { data: response, isLoading, isError, refetch } = useProjectsList();

  const projects = response?.data || [];
  const error = response?.error;
  const isOwner = user?.role === "OWNER";

  const handleRowClick = (projectId: string) => {
    router.push(routes.project.overview(projectId));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Projects</h1>
          <p className="text-muted-foreground">
            Manage your construction projects
          </p>
        </div>
        {isOwner && <CreateProjectDialog />}
      </div>

      {isLoading && (
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          </CardContent>
        </Card>
      )}

      {!isLoading && (error || isError) && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>{error?.message || "Failed to load projects"}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="ml-4"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {!isLoading && !error && projects.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>No projects yet</CardTitle>
            <CardDescription>
              {isOwner
                ? "Get started by creating your first project"
                : "Contact your account owner to create projects"}
            </CardDescription>
          </CardHeader>
          {isOwner && (
            <CardContent>
              <CreateProjectDialog />
            </CardContent>
          )}
        </Card>
      )}

      {!isLoading && !error && projects.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>All Projects</CardTitle>
            <CardDescription>
              {projects.length} {projects.length === 1 ? "project" : "projects"}{" "}
              total
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projects.map((project) => (
                  <TableRow
                    key={project.id}
                    onClick={() => handleRowClick(project.id)}
                    className="cursor-pointer"
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
    </div>
  );
}
