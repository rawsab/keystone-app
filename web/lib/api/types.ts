export interface ApiError {
  code: string;
  message: string;
}

export interface ApiResponse<T> {
  data: T | null;
  error: ApiError | null;
}

export type ApiResult<T> = Promise<ApiResponse<T>>;
