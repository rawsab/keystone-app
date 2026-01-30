"use client";

import { use, useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import {
  useDailyReport,
  useUpdateDailyReport,
  useSubmitDailyReport,
} from "@/lib/queries/dailyReports.detail.queries";
import { useProject } from "@/lib/queries/projects.queries";
import { ReportHeader } from "@/components/app/daily-reports/ReportHeader";
import { ReportEditor } from "@/components/app/daily-reports/ReportEditor";
import { AttachmentsSection } from "@/components/app/daily-reports/AttachmentsSection";
import { SubmitReportDialog } from "@/components/app/daily-reports/SubmitReportDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import { routes } from "@/lib/routes";
import { UpdateDailyReportPayload } from "@/lib/api/endpoints/dailyReports";

export default function DailyReportDetailPage({
  params,
}: {
  params: Promise<{ projectId: string; reportId: string }>;
}) {
  const { projectId, reportId } = use(params);
  const searchParams = useSearchParams();

  const {
    data: reportResponse,
    isLoading: reportLoading,
    isError: reportError,
    refetch: refetchReport,
  } = useDailyReport(reportId);

  const { data: projectResponse, isLoading: projectLoading } =
    useProject(projectId);

  const report = reportResponse?.data;
  const reportApiError = reportResponse?.error;
  const project = projectResponse?.data;

  const [formData, setFormData] = useState({
    work_completed_text: "",
    issues_delays_text: "",
    notes_text: "",
    hours_worked_total: "",
  });

  const [isInitialized, setIsInitialized] = useState(false);

  if (report && !isInitialized) {
    setFormData({
      work_completed_text: report.work_completed_text || "",
      issues_delays_text: report.issues_delays_text || "",
      notes_text: report.notes_text || "",
      hours_worked_total: report.hours_worked_total?.toString() || "",
    });
    setIsInitialized(true);
  }

  const updateMutation = useUpdateDailyReport(reportId, projectId);
  const submitMutation = useSubmitDailyReport(reportId, projectId);

  const isReadOnly = report?.status === "SUBMITTED";

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSavedData, setLastSavedData] = useState<string>("");
  const [localUpdatedAt, setLocalUpdatedAt] = useState<string | null>(null);
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleFormChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    setHasUnsavedChanges(true);
    setValidationError(null);
  };

  const handleSubmitClick = () => {
    setValidationError(null);

    const workCompleted = formData.work_completed_text.trim();
    if (!workCompleted) {
      setValidationError("Work completed is required to submit this report.");
      return;
    }

    if (hasUnsavedChanges) {
      setValidationError("Please save your changes before submitting.");
      return;
    }

    setSubmitDialogOpen(true);
  };

  const handleSubmitConfirm = () => {
    setSubmitError(null);

    submitMutation.mutate(undefined, {
      onSuccess: (response) => {
        if (response.error) {
          setSubmitError(response.error.message);
          return;
        }

        toast({
          title: "Report submitted",
          description: "The daily report has been submitted successfully.",
        });

        setSubmitDialogOpen(false);
      },
      onError: (error) => {
        setSubmitError(
          error instanceof Error ? error.message : "Failed to submit report",
        );
      },
    });
  };

  const handleSave = useCallback(() => {
    const payload: UpdateDailyReportPayload = {
      work_completed_text: formData.work_completed_text,
      issues_delays_text: formData.issues_delays_text || undefined,
      notes_text: formData.notes_text || undefined,
    };

    const hoursValue = parseFloat(formData.hours_worked_total);
    if (!isNaN(hoursValue) && hoursValue >= 0) {
      payload.hours_worked_total = hoursValue;
    }

    const currentData = JSON.stringify(formData);
    if (currentData === lastSavedData) {
      console.log("No changes to save");
      return;
    }

    console.log("Saving report:", reportId);
    console.log("Payload:", payload);

    updateMutation.mutate(payload, {
      onSuccess: (response) => {
        console.log("Save successful:", response);
        setHasUnsavedChanges(false);
        setLastSavedData(currentData);
        setLocalUpdatedAt(new Date().toISOString());
      },
      onError: (error) => {
        console.error("Save failed:", error);
      },
    });
  }, [formData, lastSavedData, updateMutation, reportId]);

  if (report && !isInitialized && !lastSavedData) {
    setLastSavedData(
      JSON.stringify({
        work_completed_text: report.work_completed_text || "",
        issues_delays_text: report.issues_delays_text || "",
        notes_text: report.notes_text || "",
        hours_worked_total: report.hours_worked_total?.toString() || "",
      }),
    );
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        if (!isReadOnly && hasUnsavedChanges && !updateMutation.isPending) {
          handleSave();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isReadOnly, hasUnsavedChanges, updateMutation.isPending, handleSave]);

  if (reportLoading || projectLoading) {
    return (
      <div className="space-y-6">
        <div className="space-y-4">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-12 w-full max-w-2xl" />
          <Skeleton className="h-6 w-64" />
        </div>
        <Skeleton className="h-[400px] w-full" />
        <Skeleton className="h-[300px] w-full" />
      </div>
    );
  }

  if (reportError || reportApiError) {
    const errorCode = reportApiError?.code;
    const errorMessage =
      reportApiError?.message || "Failed to load daily report";

    if (errorCode === "FORBIDDEN") {
      return (
        <Card>
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              You don&apos;t have permission to view this daily report.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button asChild variant="outline">
              <a href={routes.project.reports(projectId)}>Back to Reports</a>
            </Button>
            <Button asChild variant="outline">
              <a href={routes.app.projects}>Back to Projects</a>
            </Button>
          </CardContent>
        </Card>
      );
    }

    if (errorCode === "NOT_FOUND") {
      return (
        <Card>
          <CardHeader>
            <CardTitle>Report Not Found</CardTitle>
            <CardDescription>
              The daily report you&apos;re looking for doesn&apos;t exist or has
              been deleted.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <a href={routes.project.reports(projectId)}>Back to Reports</a>
            </Button>
          </CardContent>
        </Card>
      );
    }

    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between">
          <span>{errorMessage}</span>
          <Button variant="outline" size="sm" onClick={() => refetchReport()}>
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (!report) {
    return null;
  }

  return (
    <div className="space-y-6">
      <ReportHeader
        projectId={projectId}
        projectName={project?.name}
        reportDate={report.report_date}
        status={report.status}
        updatedAt={localUpdatedAt || report.updated_at}
        searchParams={searchParams}
      />

      {!isReadOnly && (
        <div className="space-y-3">
          {validationError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{validationError}</AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end items-center gap-3">
            {hasUnsavedChanges && (
              <span className="text-sm text-muted-foreground">
                Unsaved changes
              </span>
            )}
            {updateMutation.isError && (
              <span className="text-sm text-destructive">
                Failed to save:{" "}
                {updateMutation.error?.message || "Unknown error"}
              </span>
            )}
            <Button
              onClick={handleSave}
              disabled={!hasUnsavedChanges || updateMutation.isPending}
              variant="outline"
            >
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
            <Button
              onClick={handleSubmitClick}
              disabled={updateMutation.isPending || submitMutation.isPending}
            >
              Submit Report
            </Button>
          </div>
        </div>
      )}

      <ReportEditor
        isReadOnly={isReadOnly}
        formData={formData}
        onFormChange={handleFormChange}
      />

      <AttachmentsSection
        reportId={reportId}
        projectId={projectId}
        attachments={report.attachments || []}
        isReadOnly={isReadOnly}
      />

      <SubmitReportDialog
        open={submitDialogOpen}
        onOpenChange={setSubmitDialogOpen}
        onConfirm={handleSubmitConfirm}
        isSubmitting={submitMutation.isPending}
        error={submitError}
      />
    </div>
  );
}
