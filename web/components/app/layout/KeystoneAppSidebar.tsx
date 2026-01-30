"use client";

import * as React from "react";
import { Home, FolderKanban, Settings } from "lucide-react";
import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";
import { useSession } from "@/lib/providers/session-provider";
import { routes } from "@/lib/routes";

const navItems = [
  {
    title: "Dashboard",
    url: routes.app.dashboard,
    icon: Home,
  },
  {
    title: "Projects",
    url: routes.app.projects,
    icon: FolderKanban,
  },
  {
    title: "Settings",
    url: routes.app.settings,
    icon: Settings,
  },
];

export function KeystoneAppSidebar({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  const { user } = useSession();

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <span className="text-sm font-bold">K</span>
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold">Keystone</span>
            <span className="text-xs text-muted-foreground">Construction</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navItems} />
      </SidebarContent>
      <SidebarFooter>
        {user && (
          <NavUser
            user={{
              name: user.full_name,
              email: user.email,
              avatar: "",
            }}
          />
        )}
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
