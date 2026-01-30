"use client";

import { use, useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useDailyReportsList } from "@/lib/queries/dailyReports.queries";
import { useProject } from "@/lib/queries/projects.queries";
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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AlertCircle, RefreshCw, X } from "lucide-react";
import { routes } from "@/lib/routes";
import { format, formatDistanceToNow } from "date-fns";

export default function DailyReportsListPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { projectId } = use(params);

  const [fromDate, setFromDate] = useState(
    () => searchParams.get("from") || "",
  );
  const [toDate, setToDate] = useState(() => searchParams.get("to") || "");
  const [statusFilter, setStatusFilter] = useState<string>(() => {
    const status = searchParams.get("status");
    return status && ["all", "DRAFT", "SUBMITTED"].includes(status)
      ? status
      : "all";
  });

  const updateURL = (newFrom: string, newTo: string, newStatus: string) => {
    const params = new URLSearchParams();
    if (newFrom) params.set("from", newFrom);
    if (newTo) params.set("to", newTo);
    if (newStatus && newStatus !== "all") params.set("status", newStatus);

    const queryString = params.toString();
    const newPath = queryString
      ? `${routes.project.reports(projectId)}?${queryString}`
      : routes.project.reports(projectId);

    router.replace(newPath, { scroll: false });
  };

  const handleFromDateChange = (value: string) => {
    setFromDate(value);
    updateURL(value, toDate, statusFilter);
  };

  const handleToDateChange = (value: string) => {
    setToDate(value);
    updateURL(fromDate, value, statusFilter);
  };

  const handleStatusChange = (value: string) => {
    setStatusFilter(value);
    updateURL(fromDate, toDate, value);
  };

  const backendFilters = useMemo(() => {
    const f: { from_date?: string; to_date?: string } = {};
    if (fromDate) f.from_date = fromDate;
    if (toDate) f.to_date = toDate;
    return Object.keys(f).length > 0 ? f : undefined;
  }, [fromDate, toDate]);

  const { data: projectResponse, isLoading: projectLoading } =
    useProject(projectId);

  const {
    data: reportsResponse,
    isLoading: reportsLoading,
    isError: reportsError,
    refetch: refetchReports,
  } = useDailyReportsList(projectId, backendFilters);

  const project = projectResponse?.data;
  const reportsApiError = reportsResponse?.error;

  const filteredReports = useMemo(() => {
    const allReports = reportsResponse?.data || [];
    if (statusFilter === "all") return allReports;
    return allReports.filter((report) => report.status === statusFilter);
  }, [reportsResponse?.data, statusFilter]);

  const hasActiveFilters = fromDate || toDate || statusFilter !== "all";

  const handleResetFilters = () => {
    setFromDate("");
    setToDate("");
    setStatusFilter("all");
    router.replace(routes.project.reports(projectId), { scroll: false });
  };

  const handleReportClick = (reportId: string) => {
    router.push(routes.project.report(projectId, reportId));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Daily Reports</h1>
          {projectLoading ? (
            <Skeleton className="h-4 w-48 mt-2" />
          ) : project ? (
            <p className="text-muted-foreground mt-1">{project.name}</p>
          ) : null}
        </div>
        <CreateDailyReportDialog projectId={projectId} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>
            Filter reports by date range and status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <label htmlFor="from-date" className="text-sm font-medium">
                From Date
              </label>
              <Input
                id="from-date"
                type="date"
                value={fromDate}
                onChange={(e) => handleFromDateChange(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="to-date" className="text-sm font-medium">
                To Date
              </label>
              <Input
                id="to-date"
                type="date"
                value={toDate}
                onChange={(e) => handleToDateChange(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="status" className="text-sm font-medium">
                Status
              </label>
              <Select value={statusFilter} onValueChange={handleStatusChange}>
                <SelectTrigger id="status">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="DRAFT">Draft</SelectItem>
                  <SelectItem value="SUBMITTED">Submitted</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              {hasActiveFilters && (
                <Button
                  variant="outline"
                  onClick={handleResetFilters}
                  className="w-full"
                >
                  <X className="mr-2 h-4 w-4" />
                  Reset Filters
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Reports</CardTitle>
              <CardDescription>
                {filteredReports.length === 0
                  ? hasActiveFilters
                    ? "No reports match the selected filters"
                    : "No daily reports found for this project"
                  : `${filteredReports.length} ${filteredReports.length === 1 ? "report" : "reports"}`}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {reportsLoading && (
            <div className="space-y-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
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
                  {reportsApiError?.message || "Failed to load daily reports"}
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
            filteredReports.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">
                  {hasActiveFilters
                    ? "No reports match the selected filters."
                    : "No daily reports yet. Once created, they'll appear here."}
                </p>
                {hasActiveFilters && (
                  <Button
                    variant="outline"
                    onClick={handleResetFilters}
                    className="mt-4"
                  >
                    <X className="mr-2 h-4 w-4" />
                    Reset Filters
                  </Button>
                )}
              </div>
            )}

          {!reportsLoading &&
            !reportsError &&
            !reportsApiError &&
            filteredReports.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Report Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created By</TableHead>
                    <TableHead>Last Updated</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReports.map((report) => (
                    <TableRow
                      key={report.id}
                      onClick={() => handleReportClick(report.id)}
                      className="cursor-pointer"
                    >
                      <TableCell className="font-medium">
                        {format(new Date(report.report_date), "MMM d, yyyy")}
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
                      <TableCell className="text-muted-foreground text-sm">
                        {report.updated_at
                          ? formatDistanceToNow(new Date(report.updated_at), {
                              addSuffix: true,
                            })
                          : "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
