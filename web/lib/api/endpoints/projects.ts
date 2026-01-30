import { apiClient } from "../client";
import { ApiResult } from "../types";

export interface ProjectListItem {
  id: string;
  name: string;
  status: string;
  updated_at: string;
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

export async function createProject(
  payload: CreateProjectRequest,
): ApiResult<ProjectResponse> {
  return apiClient.post<ProjectResponse>("/projects", payload);
}
