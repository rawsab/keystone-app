"use client";

import * as React from "react";
import Image from "next/image";
import { LayoutDashboard, FolderKanban, Settings } from "lucide-react";

import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { useSession } from "@/lib/providers/session-provider";
import { routes } from "@/lib/routes";

function SidebarLogo() {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  return (
    <div className="flex h-12 items-center gap-3 px-1">
      <div className="flex h-6 w-6 items-center justify-center flex-shrink-0">
        <Image
          src="/logo/keystone_logo.png"
          alt="Keystone"
          width={32}
          height={32}
          className="rounded-none"
        />
      </div>
      <h1
        className={`text-lg font-semibold text-sidebar-foreground transition-opacity duration-200 ${
          isCollapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100"
        }`}
      >
        Keystone
      </h1>
    </div>
  );
}

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
        <SidebarLogo />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser
          user={{ name: user?.full_name || "User", email: user?.email || "" }}
        />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
