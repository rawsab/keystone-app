import { ApiError } from "./types";

export function isUnauthorized(error: ApiError | null): boolean {
  return error?.code === "UNAUTHORIZED";
}

export function isForbidden(error: ApiError | null): boolean {
  return error?.code === "FORBIDDEN";
}

export function isNotFound(error: ApiError | null): boolean {
  return error?.code === "NOT_FOUND";
}

export function isValidationError(error: ApiError | null): boolean {
  return error?.code === "VALIDATION_ERROR";
}

export function isConflict(error: ApiError | null): boolean {
  return error?.code === "CONFLICT";
}

export function getUserFriendlyMessage(error: ApiError | null): string {
  if (!error) return "An error occurred";

  switch (error.code) {
    case "UNAUTHORIZED":
      return "Please log in to continue";
    case "FORBIDDEN":
      return "You don't have permission to access this";
    case "NOT_FOUND":
      return "The requested resource was not found";
    case "VALIDATION_ERROR":
      return error.message;
    case "CONFLICT":
      return error.message;
    case "INTERNAL_ERROR":
      return "Something went wrong. Please try again.";
    default:
      return error.message || "An error occurred";
  }
}
