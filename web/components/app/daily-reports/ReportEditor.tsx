import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DailyReportDetail } from "@/lib/api/endpoints/dailyReports";

interface ReportEditorProps {
  report: DailyReportDetail;
  isReadOnly: boolean;
  formData: {
    work_completed_text: string;
    issues_delays_text: string;
    notes_text: string;
    hours_worked_total: string;
  };
  onFormChange: (field: string, value: string) => void;
}

export function ReportEditor({
  report,
  isReadOnly,
  formData,
  onFormChange,
}: ReportEditorProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Work Completed</CardTitle>
          <CardDescription>Describe the work completed today</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={formData.work_completed_text}
            onChange={(e) =>
              onFormChange("work_completed_text", e.target.value)
            }
            disabled={isReadOnly}
            placeholder="Enter work completed..."
            rows={6}
            className="resize-none"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Issues & Delays</CardTitle>
          <CardDescription>
            Document any issues, delays, or concerns (optional)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={formData.issues_delays_text}
            onChange={(e) => onFormChange("issues_delays_text", e.target.value)}
            disabled={isReadOnly}
            placeholder="Describe any issues or delays..."
            rows={4}
            className="resize-none"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notes</CardTitle>
          <CardDescription>
            Additional notes or observations (optional)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={formData.notes_text}
            onChange={(e) => onFormChange("notes_text", e.target.value)}
            disabled={isReadOnly}
            placeholder="Enter additional notes..."
            rows={4}
            className="resize-none"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Hours Worked</CardTitle>
          <CardDescription>
            Total hours worked by the team today (optional)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="hours">Total Hours</Label>
            <Input
              id="hours"
              type="number"
              step="0.5"
              min="0"
              value={formData.hours_worked_total}
              onChange={(e) =>
                onFormChange("hours_worked_total", e.target.value)
              }
              disabled={isReadOnly}
              placeholder="0"
              className="max-w-xs"
            />
          </div>
        </CardContent>
      </Card>

      {report.attachments && report.attachments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Attachments</CardTitle>
            <CardDescription>
              {report.attachments.length} file(s) attached
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {report.attachments.map((attachment) => (
                <div
                  key={attachment.id}
                  className="flex items-center justify-between p-2 border rounded"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {attachment.original_filename}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {(attachment.size_bytes / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
