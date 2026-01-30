"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app/layout/AppShell";
import { useSession } from "@/lib/providers/session-provider";
import { Skeleton } from "@/components/ui/skeleton";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="flex h-screen flex-col">
        <div className="border-b bg-background p-4">
          <Skeleton className="h-8 w-32" />
        </div>
        <div className="flex flex-1">
          <div className="w-64 border-r p-4">
            <Skeleton className="h-8 w-full mb-2" />
            <Skeleton className="h-8 w-full mb-2" />
            <Skeleton className="h-8 w-full" />
          </div>
          <div className="flex-1 p-6">
            <Skeleton className="h-8 w-64 mb-4" />
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <AppShell>{children}</AppShell>;
}
