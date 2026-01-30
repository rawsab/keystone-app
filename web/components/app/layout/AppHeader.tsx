"use client";

import { useSession } from "@/lib/providers/session-provider";
import { Button } from "@/components/ui/button";
import { LogOut, User } from "lucide-react";

export function AppHeader() {
  const { user, logout } = useSession();

  return (
    <header className="border-b bg-background">
      <div className="flex h-16 items-center px-6">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-semibold">Keystone</h1>
        </div>
        <div className="ml-auto flex items-center gap-4">
          {user && (
            <>
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{user.full_name}</span>
                <span className="text-muted-foreground">({user.email})</span>
              </div>
              <Button variant="ghost" size="sm" onClick={logout}>
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
