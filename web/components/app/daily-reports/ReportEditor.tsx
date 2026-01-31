"use client";

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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RefreshCw, X, Plus } from "lucide-react";
import { useRefreshDailyReportWeather } from "@/lib/queries/dailyReports.detail.queries";
import type { DailyReportWeatherSnapshot } from "@/lib/api/endpoints/dailyReports";

const WEATHER_FLAGS = [
  { key: "rain", label: "Rain" },
  { key: "snow", label: "Snow" },
  { key: "mud", label: "Mud" },
  { key: "high_wind", label: "High wind" },
  { key: "extreme_heat", label: "Extreme heat" },
  { key: "extreme_cold", label: "Extreme cold" },
  { key: "lightning", label: "Lightning" },
] as const;

function formatRelativeTime(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const sec = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (sec < 60) return "just now";
  if (sec < 3600) return `${Math.floor(sec / 60)} min ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)} hr ago`;
  return `${Math.floor(sec / 86400)} day(s) ago`;
}

export interface ReportEditorWeatherData {
  weather_snapshot: DailyReportWeatherSnapshot | null;
  weather_snapshot_source: string | null;
  weather_snapshot_taken_at: string | null;
  weather_summary_text: string | null;
  /** Set when refresh was attempted and failed; explains why weather is missing */
  weather_refresh_error?: string | null;
}

export interface ReportEditorFormData {
  work_completed_text: string;
  issues_delays_text: string;
  notes_text: string;
  hours_worked_total: string;
  weather_observed_text: string;
  weather_observed_flags: Record<string, boolean>;
}

interface ReportEditorProps {
  isReadOnly: boolean;
  formData: ReportEditorFormData;
  onFormChange: (
    field: string,
    value: string | Record<string, boolean>,
  ) => void;
  weather?: ReportEditorWeatherData | null;
  reportId?: string;
  projectId?: string;
  onRemoveAutoWeather?: () => void;
  onAddAutoWeather?: () => void;
  /** When true, Add Auto Weather button shows loading (e.g. when parent is refreshing). */
  isRefreshingWeather?: boolean;
  /** When true, show Add Auto Weather button instead of the card (optimistic remove). */
  hideAutoWeatherCard?: boolean;
  /** Called when the Refresh weather action succeeds (so parent can e.g. mark unsaved). */
  onWeatherRefreshed?: () => void;
}

export function ReportEditor({
  isReadOnly,
  formData,
  onFormChange,
  weather,
  reportId,
  projectId,
  onRemoveAutoWeather,
  onAddAutoWeather,
  isRefreshingWeather = false,
  hideAutoWeatherCard = false,
  onWeatherRefreshed,
}: ReportEditorProps) {
  const refreshMutation = useRefreshDailyReportWeather(
    reportId ?? "",
    projectId,
  );

  const handleRefreshWeather = () => {
    if (!reportId) return;
    refreshMutation.mutate(undefined, {
      onSuccess: () => onWeatherRefreshed?.(),
    });
  };

  const toggleFlag = (key: string) => {
    if (isReadOnly) return;
    const next = {
      ...formData.weather_observed_flags,
      [key]: !formData.weather_observed_flags[key],
    };
    onFormChange("weather_observed_flags", next);
  };

  return (
    <div className="space-y-6">
      {/* Weather card */}
      <Card>
        <CardHeader>
          <CardTitle>Weather</CardTitle>
          <CardDescription>
            Auto-captured weather for the report date and observed conditions on
            site
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Auto Weather: show card when we have snapshot/summary/source or a refresh error and not hidden; otherwise show Add button */}
          {!hideAutoWeatherCard &&
          (weather?.weather_snapshot != null ||
            weather?.weather_summary_text != null ||
            weather?.weather_snapshot_source != null ||
            weather?.weather_refresh_error != null) ? (
            <div className="rounded-lg border bg-muted/40 p-4 space-y-2 relative">
              {!isReadOnly && onRemoveAutoWeather && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 h-8 w-8 text-muted-foreground hover:text-foreground"
                  onClick={onRemoveAutoWeather}
                  aria-label="Remove auto weather"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
              <div className="text-sm font-medium text-muted-foreground">
                Auto Weather
              </div>
              {weather?.weather_summary_text ? (
                <>
                  <p className="text-sm">{weather.weather_summary_text}</p>
                  <div className="flex flex-wrap items-center gap-2">
                    {!isReadOnly && reportId && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleRefreshWeather}
                        disabled={refreshMutation.isPending}
                      >
                        <RefreshCw
                          className={`h-4 w-4 mr-1 ${refreshMutation.isPending ? "animate-spin" : ""}`}
                        />
                        Refresh
                      </Button>
                    )}
                    {weather.weather_snapshot_source && (
                      <Badge variant="secondary" className="text-xs">
                        {weather.weather_snapshot_source}
                      </Badge>
                    )}
                    {weather.weather_snapshot_taken_at && (
                      <span className="text-xs text-muted-foreground">
                        Captured{" "}
                        {formatRelativeTime(weather.weather_snapshot_taken_at)}
                      </span>
                    )}
                  </div>
                </>
              ) : (
                <div className="space-y-2">
                  {weather?.weather_refresh_error && (
                    <Alert variant="destructive">
                      <AlertDescription>
                        {weather.weather_refresh_error}
                      </AlertDescription>
                    </Alert>
                  )}
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm text-muted-foreground">
                      {weather?.weather_refresh_error
                        ? "Weather could not be loaded."
                        : "Weather not available yet."}
                    </p>
                    {!isReadOnly && reportId && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleRefreshWeather}
                        disabled={refreshMutation.isPending}
                      >
                        <RefreshCw
                          className={`h-4 w-4 mr-1 ${refreshMutation.isPending ? "animate-spin" : ""}`}
                        />
                        Refresh
                      </Button>
                    )}
                  </div>
                </div>
              )}
              {(refreshMutation.isError || refreshMutation.data?.error) && (
                <Alert variant="destructive">
                  <AlertDescription>
                    {refreshMutation.data?.error?.message ??
                      refreshMutation.error?.message ??
                      "Failed to refresh weather"}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          ) : (
            !isReadOnly &&
            reportId &&
            onAddAutoWeather && (
              <Button
                type="button"
                variant="outline"
                className="w-full justify-start gap-2 py-6 border-dashed"
                onClick={onAddAutoWeather}
                disabled={refreshMutation.isPending || isRefreshingWeather}
              >
                <Plus className="h-4 w-4 shrink-0" />
                Add Auto Weather
              </Button>
            )
          )}

          {/* Observed Conditions */}
          <div className="rounded-lg border bg-muted/40 p-4 space-y-3">
            <div className="text-sm font-medium text-muted-foreground">
              Observed Conditions
            </div>
            <Textarea
              value={formData.weather_observed_text}
              onChange={(e) =>
                onFormChange("weather_observed_text", e.target.value)
              }
              disabled={isReadOnly}
              placeholder="Observed site conditions…"
              rows={3}
              className="resize-none"
            />
            <div className="flex flex-wrap gap-2">
              {WEATHER_FLAGS.map(({ key, label }) => (
                <Button
                  key={key}
                  type="button"
                  variant={
                    formData.weather_observed_flags[key] ? "default" : "outline"
                  }
                  size="sm"
                  onClick={() => toggleFlag(key)}
                  disabled={isReadOnly}
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

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
          <div className="space-y-2 space-x-3">
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
