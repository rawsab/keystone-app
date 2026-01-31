"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useProjectsList } from "@/lib/queries/projects.queries";
import { useSession } from "@/lib/providers/session-provider";
import { CreateProjectDialog } from "@/components/app/projects/CreateProjectDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { AlertCircle, RefreshCw, Search, ArrowUpDown } from "lucide-react";
import { routes } from "@/lib/routes";
import { formatDistanceToNow } from "date-fns";

type SortField =
  | "project_number"
  | "name"
  | "company_name"
  | "address_display"
  | "status"
  | "updated_at";
type SortDirection = "asc" | "desc";

export default function ProjectsPage() {
  const router = useRouter();
  const { user } = useSession();
  const { data: response, isLoading, isError, refetch } = useProjectsList();

  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>("updated_at");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const projects = response?.data || [];
  const error = response?.error;
  const isOwner = user?.role === "OWNER";

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const filteredAndSortedProjects = useMemo(() => {
    let filtered = projects;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = projects.filter(
        (project) =>
          project.project_number.toLowerCase().includes(query) ||
          project.name.toLowerCase().includes(query) ||
          project.company_name.toLowerCase().includes(query) ||
          project.address_display.toLowerCase().includes(query),
      );
    }

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      let aValue: string | number = a[sortField];
      let bValue: string | number = b[sortField];

      // Handle date sorting
      if (sortField === "updated_at") {
        aValue = new Date(a.updated_at).getTime();
        bValue = new Date(b.updated_at).getTime();
      } else {
        aValue = String(aValue).toLowerCase();
        bValue = String(bValue).toLowerCase();
      }

      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [projects, searchQuery, sortField, sortDirection]);

  const handleRowClick = (projectId: string) => {
    router.push(routes.project.overview(projectId));
  };

  const SortableHeader = ({
    field,
    children,
  }: {
    field: SortField;
    children: React.ReactNode;
  }) => (
    <TableHead
      className="cursor-pointer select-none hover:bg-muted/50"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-1">
        {children}
        <ArrowUpDown className="h-3 w-3" />
      </div>
    </TableHead>
  );

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
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>All Projects</CardTitle>
                <CardDescription>
                  {filteredAndSortedProjects.length} of {projects.length}{" "}
                  {projects.length === 1 ? "project" : "projects"}
                </CardDescription>
              </div>
              <div className="relative w-64">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search projects..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredAndSortedProjects.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No projects match your search criteria.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortableHeader field="project_number">ID</SortableHeader>
                    <SortableHeader field="name">Name</SortableHeader>
                    <SortableHeader field="company_name">
                      Company
                    </SortableHeader>
                    <SortableHeader field="address_display">
                      Address
                    </SortableHeader>
                    <SortableHeader field="status">Status</SortableHeader>
                    <SortableHeader field="updated_at">
                      Last Updated
                    </SortableHeader>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAndSortedProjects.map((project) => (
                    <TableRow
                      key={project.id}
                      onClick={() => handleRowClick(project.id)}
                      className="cursor-pointer"
                    >
                      <TableCell className="font-mono text-sm">
                        {project.project_number}
                      </TableCell>
                      <TableCell className="font-medium">
                        {project.name}
                      </TableCell>
                      <TableCell>{project.company_name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                        {project.address_display}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            project.status === "ACTIVE"
                              ? "default"
                              : "secondary"
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
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
