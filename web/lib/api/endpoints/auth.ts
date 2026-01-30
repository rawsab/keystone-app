import { apiClient } from "../client";
import { ApiResult } from "../types";

interface LoginRequest {
  email: string;
  password: string;
}

interface SignupRequest {
  company_name: string;
  full_name: string;
  email: string;
  password: string;
}

interface AuthResponse {
  token: string;
  user: {
    id: string;
    email: string;
    full_name: string;
    role: string;
  };
}

interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
}

export async function login(
  credentials: LoginRequest,
): ApiResult<AuthResponse> {
  return apiClient.post<AuthResponse>("/auth/login", credentials);
}

export async function signup(data: SignupRequest): ApiResult<AuthResponse> {
  return apiClient.post<AuthResponse>("/auth/signup", data);
}

export async function getCurrentUser(): ApiResult<User> {
  return apiClient.get<User>("/users/me");
}
