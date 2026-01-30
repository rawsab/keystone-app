import { use } from "react";

export default function DailyReportDetailPage({
  params,
}: {
  params: Promise<{ projectId: string; reportId: string }>;
}) {
  const { reportId } = use(params);

  return (
    <div className="p-8">
      <p className="text-muted-foreground">
        Daily Report {reportId} (W7+ placeholder)
      </p>
    </div>
  );
}
