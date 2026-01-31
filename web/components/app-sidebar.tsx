"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, FileText, Settings } from "lucide-react";

import { NavProjectsDropdown } from "@/components/nav-projects-dropdown";
import { NavUser } from "@/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
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
      <div className="flex h-6 w-6 items-center justify-center shrink-0">
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
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarLogo />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={pathname === routes.app.dashboard}
              >
                <Link href={routes.app.dashboard}>
                  <LayoutDashboard className="size-4" />
                  <span>Dashboard</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <NavProjectsDropdown />
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={pathname === routes.app.files}
              >
                <Link href={routes.app.files}>
                  <FileText className="size-4" />
                  <span>Documents</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={pathname === routes.app.settings}
              >
                <Link href={routes.app.settings}>
                  <Settings className="size-4" />
                  <span>Settings</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
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
