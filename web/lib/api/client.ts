import { ApiResponse } from "./types";
import { getToken } from "./auth";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000/api/v1";

export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<ApiResponse<T>> {
    try {
      const url = `${this.baseUrl}${endpoint}`;

      const token = getToken();
      const headers: Record<string, string> = {};
      // Only set Content-Type when sending a body (avoid "body cannot be empty" errors for GET/DELETE)
      if (options.body != null && options.body !== "") {
        headers["Content-Type"] = "application/json";
      }

      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      if (options.headers) {
        Object.assign(headers, options.headers);
      }

      const response = await fetch(url, {
        ...options,
        headers,
      });

      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        const err = body?.error;
        const message =
          typeof err === "object" &&
          err !== null &&
          typeof err.message === "string"
            ? err.message
            : typeof body?.message === "string"
              ? body.message
              : Array.isArray(body?.message)
                ? body.message[0]
                : response.status === 404
                  ? "Resource not found. Ensure NEXT_PUBLIC_API_BASE_URL points to the backend."
                  : response.statusText || "Request failed";
        return {
          data: null,
          error: {
            code: String(response.status),
            message,
          },
        };
      }
      return (body ?? { data: null, error: null }) as ApiResponse<T>;
    } catch {
      return {
        data: null,
        error: {
          code: "NETWORK_ERROR",
          message: "Unable to connect to the server",
        },
      };
    }
  }

  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: "GET" });
  }

  async post<T>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async patch<T>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: "DELETE" });
  }
}

export const apiClient = new ApiClient();
