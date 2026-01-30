"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useGetOrCreateDailyReportDraft } from "@/lib/queries/dailyReports.create.queries";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { AlertCircle, CalendarIcon, Plus } from "lucide-react";
import { routes } from "@/lib/routes";
import { formatDateYYYYMMDDLocal, isFutureDate } from "@/lib/dates";
import { format } from "date-fns";

interface CreateDailyReportDialogProps {
  projectId: string;
  trigger?: React.ReactNode;
}

export function CreateDailyReportDialog({
  projectId,
  trigger,
}: CreateDailyReportDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [error, setError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const createMutation = useGetOrCreateDailyReportDraft(projectId);

  const handleSubmit = () => {
    setError(null);
    setValidationError(null);

    if (isFutureDate(selectedDate)) {
      setValidationError("Cannot create reports for future dates.");
      return;
    }

    const dateString = formatDateYYYYMMDDLocal(selectedDate);

    createMutation.mutate(dateString, {
      onSuccess: (response) => {
        if (response.error) {
          setError(response.error.message);
          return;
        }

        if (response.data) {
          setOpen(false);
          router.push(routes.project.report(projectId, response.data.id));
        }
      },
      onError: (err) => {
        setError(
          err instanceof Error ? err.message : "Failed to create report",
        );
      },
    });
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      setSelectedDate(new Date());
      setError(null);
      setValidationError(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Plus className="mr-0 h-4 w-4" />
            Create Daily Report
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Daily Report</DialogTitle>
          <DialogDescription>
            Select a date for the daily report. If a report already exists for
            this date, it will be opened.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {validationError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{validationError}</AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label>Report Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(selectedDate, "PPP")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => {
                    if (date) {
                      setSelectedDate(date);
                      setValidationError(null);
                    }
                  }}
                  disabled={(date) => isFutureDate(date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <p className="text-xs text-muted-foreground">
              Past dates allowed. Future dates blocked.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={createMutation.isPending}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={createMutation.isPending}>
            {createMutation.isPending ? "Creating..." : "Create / Open"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
