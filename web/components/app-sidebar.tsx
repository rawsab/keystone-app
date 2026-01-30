"use client";

import * as React from "react";
import { LayoutDashboard, FolderKanban, Settings } from "lucide-react";

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

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user } = useSession();

  const navMain = [
    {
      title: "Dashboard",
      url: routes.app.dashboard,
      icon: LayoutDashboard,
      isActive: true,
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

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <div className="flex h-12 items-center px-4">
          <h1 className="text-lg font-semibold">Keystone</h1>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user || { name: "User", email: "", avatar: "" }} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
