import { apiClient } from "../client";
import { ApiResult } from "../types";

export interface ProjectListItem {
  id: string;
  project_number: string;
  name: string;
  company_name: string;
  address_display: string;
  status: string;
  updated_at: string;
}

export interface ProjectDetail extends ProjectListItem {
  address_line_1: string;
  address_line_2?: string;
  city: string;
  region: string;
  postal_code: string;
  country: string;
  location?: string;
}

export interface CreateProjectRequest {
  project_number: string;
  name: string;
  company_name: string;
  address_line_1: string;
  address_line_2?: string;
  city: string;
  region: string;
  postal_code: string;
  country: string;
  location?: string;
}

export interface ProjectResponse {
  id: string;
  project_number: string;
  name: string;
  company_name: string;
  address_line_1: string;
  address_line_2?: string;
  city: string;
  region: string;
  postal_code: string;
  country: string;
  address_display: string;
  location?: string;
  status: string;
  updated_at: string;
}

export async function listProjects(): ApiResult<ProjectListItem[]> {
  return apiClient.get<ProjectListItem[]>("/projects");
}

export async function getProject(
  projectId: string,
): ApiResult<ProjectResponse> {
  return apiClient.get<ProjectResponse>(`/projects/${projectId}`);
}

export interface UpdateProjectRequest {
  project_number?: string;
  name?: string;
  company_name?: string;
  address_line_1?: string;
  address_line_2?: string;
  city?: string;
  region?: string;
  postal_code?: string;
  country?: string;
  location?: string;
  status?: "ACTIVE" | "ARCHIVED";
}

export async function updateProject(
  projectId: string,
  payload: UpdateProjectRequest,
): ApiResult<ProjectResponse> {
  return apiClient.patch<ProjectResponse>(`/projects/${projectId}`, payload);
}

/**
 * TEMPORARY WORKAROUND.
 * This function fetches the full project list and filters client-side
 * because GET /projects/:id does not exist yet.
 *
 * Do NOT reuse this pattern for other resources.
 * Backend should add GET /projects/:id endpoint.
 *
 * Implications:
 * - Overfetches (gets all projects instead of one)
 * - Scales poorly as project list grows
 * - Couples detail view to list endpoint shape
 */
export async function getProjectFromListFallback(
  projectId: string,
): ApiResult<ProjectDetail> {
  const response = await apiClient.get<ProjectListItem[]>("/projects");

  if (response.error) {
    return {
      data: null,
      error: response.error,
    };
  }

  const project = response.data?.find((p) => p.id === projectId);

  if (!project) {
    return {
      data: null,
      error: {
        code: "NOT_FOUND",
        message: "Project not found",
      },
    };
  }

  return {
    data: project as ProjectDetail,
    error: null,
  };
}

export async function createProject(
  payload: CreateProjectRequest,
): ApiResult<ProjectResponse> {
  return apiClient.post<ProjectResponse>("/projects", payload);
}
