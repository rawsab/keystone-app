import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function ProjectOverviewPage({
  params,
}: {
  params: { projectId: string };
}) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Project Overview</h1>
        <p className="text-muted-foreground">Project ID: {params.projectId}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Project Dashboard</CardTitle>
          <CardDescription>
            Project dashboard will be implemented in W5
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            This is a placeholder. The full project dashboard with details, team
            members, and recent reports will be implemented in the next task.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
