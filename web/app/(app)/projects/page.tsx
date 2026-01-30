import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function ProjectsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Projects</h1>
        <p className="text-muted-foreground">
          Manage your construction projects
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Projects List</CardTitle>
          <CardDescription>
            Project list will be implemented in W4
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            This is a placeholder. The projects list, project selection, and
            project dashboard will be implemented in the next tasks.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
