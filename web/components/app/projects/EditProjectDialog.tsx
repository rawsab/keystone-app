"use client";

import { useState, useEffect } from "react";
import { useProject, useUpdateProject } from "@/lib/queries/projects.queries";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

const initialFormData = {
  project_number: "",
  name: "",
  company_name: "",
  address_line_1: "",
  address_line_2: "",
  city: "",
  region: "",
  postal_code: "",
  country: "Canada",
  status: "ACTIVE" as "ACTIVE" | "ARCHIVED",
};

export function EditProjectDialog({
  projectId,
  open,
  onOpenChange,
}: {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [formData, setFormData] = useState(initialFormData);
  const [error, setError] = useState<string | null>(null);

  const { data: response, isLoading: projectLoading } = useProject(projectId);
  const project = response?.data;
  const updateProject = useUpdateProject(projectId);

  useEffect(() => {
    if (open && project) {
      setFormData({
        project_number: project.project_number ?? "",
        name: project.name ?? "",
        company_name: project.company_name ?? "",
        address_line_1: project.address_line_1 ?? "",
        address_line_2: project.address_line_2 ?? "",
        city: project.city ?? "",
        region: project.region ?? "",
        postal_code: project.postal_code ?? "",
        country: project.country ?? "Canada",
        status: (project.status === "ARCHIVED" ? "ARCHIVED" : "ACTIVE") as
          | "ACTIVE"
          | "ARCHIVED",
      });
      setError(null);
    }
  }, [open, project]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.project_number.trim()) {
      setError("Project number is required");
      return;
    }
    if (!formData.name.trim()) {
      setError("Project name is required");
      return;
    }
    if (!formData.company_name.trim()) {
      setError("Company name is required");
      return;
    }
    if (!formData.address_line_1.trim()) {
      setError("Address line 1 is required");
      return;
    }
    if (!formData.city.trim()) {
      setError("City is required");
      return;
    }
    if (!formData.region.trim()) {
      setError("Province/State is required");
      return;
    }
    if (!formData.postal_code.trim()) {
      setError("Postal code is required");
      return;
    }
    if (!formData.country.trim()) {
      setError("Country is required");
      return;
    }

    const res = await updateProject.mutateAsync({
      project_number: formData.project_number.trim(),
      name: formData.name.trim(),
      company_name: formData.company_name.trim(),
      address_line_1: formData.address_line_1.trim(),
      address_line_2: formData.address_line_2.trim() || undefined,
      city: formData.city.trim(),
      region: formData.region.trim(),
      postal_code: formData.postal_code.trim(),
      country: formData.country.trim(),
      status: formData.status,
    });

    if (res.error) {
      setError(res.error.message);
      return;
    }

    toast({
      title: "Project updated",
      description: `"${formData.name}" has been updated successfully.`,
    });

    onOpenChange(false);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) setError(null);
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        {projectLoading || !project ? (
          <div className="space-y-4 py-4">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>Edit Project</DialogTitle>
              <DialogDescription>
                Update project metadata and status.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="edit-project_number">
                  Project ID <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="edit-project_number"
                  value={formData.project_number}
                  onChange={(e) =>
                    setFormData({ ...formData, project_number: e.target.value })
                  }
                  required
                  placeholder="PRJ-001"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-name">
                  Project Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                  placeholder="Downtown Tower Construction"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-company_name">
                  Company <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="edit-company_name"
                  value={formData.company_name}
                  onChange={(e) =>
                    setFormData({ ...formData, company_name: e.target.value })
                  }
                  required
                  placeholder="ABC Construction Inc."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value: "ACTIVE" | "ARCHIVED") =>
                    setFormData({ ...formData, status: value })
                  }
                >
                  <SelectTrigger id="edit-status">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="ARCHIVED">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-address_line_1">
                  Address Line 1 <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="edit-address_line_1"
                  value={formData.address_line_1}
                  onChange={(e) =>
                    setFormData({ ...formData, address_line_1: e.target.value })
                  }
                  required
                  placeholder="123 Main Street"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-address_line_2">Address Line 2</Label>
                <Input
                  id="edit-address_line_2"
                  value={formData.address_line_2}
                  onChange={(e) =>
                    setFormData({ ...formData, address_line_2: e.target.value })
                  }
                  placeholder="Suite 100"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-city">
                    City <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="edit-city"
                    value={formData.city}
                    onChange={(e) =>
                      setFormData({ ...formData, city: e.target.value })
                    }
                    required
                    placeholder="Toronto"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-region">
                    Province/State <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="edit-region"
                    value={formData.region}
                    onChange={(e) =>
                      setFormData({ ...formData, region: e.target.value })
                    }
                    required
                    placeholder="Ontario"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-postal_code">
                    Postal Code <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="edit-postal_code"
                    value={formData.postal_code}
                    onChange={(e) =>
                      setFormData({ ...formData, postal_code: e.target.value })
                    }
                    required
                    placeholder="M5H 2N2"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-country">
                    Country <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="edit-country"
                    value={formData.country}
                    onChange={(e) =>
                      setFormData({ ...formData, country: e.target.value })
                    }
                    required
                    placeholder="Canada"
                  />
                </div>
              </div>
            </div>

            <Separator className="mb-4" />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={updateProject.isPending}>
                {updateProject.isPending ? "Saving..." : "Save changes"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
