"use client";

import { createContext, useContext, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { getCurrentUser } from "../api/endpoints/auth";
import { clearToken, initFromStorage } from "../api/auth";

interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
}

interface SessionContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  logout: () => void;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const queryClient = useQueryClient();

  useEffect(() => {
    initFromStorage();
  }, []);

  const {
    data: response,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["session", "me"],
    queryFn: getCurrentUser,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (error || response?.error?.code === "UNAUTHORIZED") {
      clearToken();
    }
  }, [error, response]);

  const logout = () => {
    clearToken();
    queryClient.clear();
    router.push("/login");
  };

  const user = response?.data || null;
  const isAuthenticated = !!user && !response?.error;

  return (
    <SessionContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading,
        logout,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error("useSession must be used within SessionProvider");
  }
  return context;
}
