import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { routes } from "@/lib/routes";
import { formatDistanceToNow } from "date-fns";

interface ReportHeaderProps {
  projectId: string;
  projectName?: string;
  reportDate: string;
  status: string;
  updatedAt: string;
  searchParams?: URLSearchParams;
}

export function ReportHeader({
  projectId,
  projectName,
  reportDate,
  status,
  updatedAt,
  searchParams,
}: ReportHeaderProps) {
  const reportsListUrl = searchParams
    ? `${routes.project.reports(projectId)}?${searchParams.toString()}`
    : routes.project.reports(projectId);

  const formattedDate = new Date(reportDate).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const updatedAgo = formatDistanceToNow(new Date(updatedAt), {
    addSuffix: true,
  });

  return (
    <div className="space-y-4">
      <div>
        <Link href={reportsListUrl}>
          <Button variant="ghost" size="sm" className="mb-2">
            <ChevronLeft className="mr-1 h-4 w-4" />
            Back to Reports
          </Button>
        </Link>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Daily Report</h1>
            <p className="text-muted-foreground mt-1">
              {projectName && <span>{projectName} • </span>}
              {formattedDate}
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right text-sm text-muted-foreground">
              Updated {updatedAgo}
            </div>
            <Badge variant={status === "SUBMITTED" ? "default" : "secondary"}>
              {status}
            </Badge>
          </div>
        </div>
      </div>

      {status === "SUBMITTED" && (
        <Alert>
          <AlertDescription>
            This report has been submitted and is read-only. Changes cannot be
            made to submitted reports.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
