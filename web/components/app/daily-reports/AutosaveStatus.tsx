import { CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

interface AutosaveStatusProps {
  isSaving: boolean;
  isError: boolean;
  error?: Error | { message?: string };
  onRetry?: () => void;
}

export function AutosaveStatus({
  isSaving,
  isError,
  error,
  onRetry,
}: AutosaveStatusProps) {
  if (isError) {
    return (
      <Alert
        variant="destructive"
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to save: {error?.message || "Unknown error"}
          </AlertDescription>
        </div>
        {onRetry && (
          <Button size="sm" variant="outline" onClick={onRetry}>
            Retry Save
          </Button>
        )}
      </Alert>
    );
  }

  if (isSaving) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Saving...</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <CheckCircle2 className="h-4 w-4 text-green-600" />
      <span>Saved</span>
    </div>
  );
}
