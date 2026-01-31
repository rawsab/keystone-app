"use client";

import { useState } from "react";
import { useCreateProject } from "@/lib/queries/projects.queries";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Plus } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";

export function CreateProjectDialog() {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    project_number: "",
    name: "",
    company_name: "",
    address_line_1: "",
    address_line_2: "",
    city: "",
    region: "",
    postal_code: "",
    country: "Canada",
    location: "",
  });
  const [error, setError] = useState<string | null>(null);

  const createProject = useCreateProject();

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

    const response = await createProject.mutateAsync({
      project_number: formData.project_number.trim(),
      name: formData.name.trim(),
      company_name: formData.company_name.trim(),
      address_line_1: formData.address_line_1.trim(),
      address_line_2: formData.address_line_2.trim() || undefined,
      city: formData.city.trim(),
      region: formData.region.trim(),
      postal_code: formData.postal_code.trim(),
      country: formData.country.trim(),
      location: formData.location.trim() || undefined,
    });

    if (response.error) {
      setError(response.error.message);
      return;
    }

    toast({
      title: "Project created",
      description: `"${formData.name}" has been created successfully.`,
    });

    setOpen(false);
    setFormData({
      project_number: "",
      name: "",
      company_name: "",
      address_line_1: "",
      address_line_2: "",
      city: "",
      region: "",
      postal_code: "",
      country: "Canada",
      location: "",
    });
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      setFormData({
        project_number: "",
        name: "",
        company_name: "",
        address_line_1: "",
        address_line_2: "",
        city: "",
        region: "",
        postal_code: "",
        country: "Canada",
        location: "",
      });
      setError(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-0 h-4 w-4" />
          Create Project
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
            <DialogDescription>
              Add a new construction project to your account.
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
              <Label htmlFor="project_number">
                Project ID <span className="text-destructive">*</span>
              </Label>
              <Input
                id="project_number"
                value={formData.project_number}
                onChange={(e) =>
                  setFormData({ ...formData, project_number: e.target.value })
                }
                required
                placeholder="PRJ-001"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">
                Project Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required
                placeholder="Downtown Tower Construction"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="company_name">
                Company <span className="text-destructive">*</span>
              </Label>
              <Input
                id="company_name"
                value={formData.company_name}
                onChange={(e) =>
                  setFormData({ ...formData, company_name: e.target.value })
                }
                required
                placeholder="ABC Construction Inc."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address_line_1">
                Address Line 1 <span className="text-destructive">*</span>
              </Label>
              <Input
                id="address_line_1"
                value={formData.address_line_1}
                onChange={(e) =>
                  setFormData({ ...formData, address_line_1: e.target.value })
                }
                required
                placeholder="123 Main Street"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address_line_2">Address Line 2</Label>
              <Input
                id="address_line_2"
                value={formData.address_line_2}
                onChange={(e) =>
                  setFormData({ ...formData, address_line_2: e.target.value })
                }
                placeholder="Suite 100"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">
                  City <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) =>
                    setFormData({ ...formData, city: e.target.value })
                  }
                  required
                  placeholder="Toronto"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="region">
                  Province/State <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="region"
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
                <Label htmlFor="postal_code">
                  Postal Code <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="postal_code"
                  value={formData.postal_code}
                  onChange={(e) =>
                    setFormData({ ...formData, postal_code: e.target.value })
                  }
                  required
                  placeholder="M5H 2N2"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="country">
                  Country <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="country"
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
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createProject.isPending}>
              {createProject.isPending ? "Creating..." : "Create Project"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
