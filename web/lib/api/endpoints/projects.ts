import { apiClient } from "../client";
import { ApiResult } from "../types";

export interface ProjectListItem {
  id: string;
  name: string;
  status: string;
  updated_at: string;
  location?: string;
}

export interface ProjectDetail extends ProjectListItem {
  location?: string;
}

export interface CreateProjectRequest {
  name: string;
  location?: string;
}

export interface ProjectResponse {
  id: string;
  name: string;
  status: string;
}

export async function listProjects(): ApiResult<ProjectListItem[]> {
  return apiClient.get<ProjectListItem[]>("/projects");
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
