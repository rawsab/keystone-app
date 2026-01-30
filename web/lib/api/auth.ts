const TOKEN_KEY = "keystone_auth_token";

let inMemoryToken: string | null = null;

export function getToken(): string | null {
  if (inMemoryToken) {
    return inMemoryToken;
  }

  if (typeof window !== "undefined") {
    return localStorage.getItem(TOKEN_KEY);
  }

  return null;
}

export function setToken(token: string): void {
  inMemoryToken = token;

  if (typeof window !== "undefined") {
    localStorage.setItem(TOKEN_KEY, token);
  }
}

export function clearToken(): void {
  inMemoryToken = null;

  if (typeof window !== "undefined") {
    localStorage.removeItem(TOKEN_KEY);
  }
}

export function initFromStorage(): void {
  if (typeof window !== "undefined") {
    const storedToken = localStorage.getItem(TOKEN_KEY);
    if (storedToken) {
      inMemoryToken = storedToken;
    }
  }
}
