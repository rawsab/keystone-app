import { apiClient } from "../client";
import { ApiResult } from "../types";

interface HealthResponse {
  ok: boolean;
}

export async function health(): ApiResult<HealthResponse> {
  return apiClient.get<HealthResponse>("/health");
}
