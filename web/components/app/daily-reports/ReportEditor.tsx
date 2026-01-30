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

interface ReportEditorProps {
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
    </div>
  );
}
