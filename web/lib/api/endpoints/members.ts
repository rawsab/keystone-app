import { apiClient } from "../client";
import { ApiResult } from "../types";

export interface ProjectMember {
  id: string;
  full_name: string;
  email: string;
  project_role: string;
}

export async function listMembers(
  projectId: string,
): ApiResult<ProjectMember[]> {
  return apiClient.get<ProjectMember[]>(`/projects/${projectId}/members`);
}
