"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FolderKanban, ChevronDown } from "lucide-react";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import { useProjectsList } from "@/lib/queries/projects.queries";
import { routes } from "@/lib/routes";

export function NavProjectsDropdown() {
  const pathname = usePathname();
  const { data: response, isLoading } = useProjectsList();
  const projects = response?.data ?? [];

  const isProjectRoute = pathname.startsWith("/projects/");

  return (
    <Collapsible defaultOpen={isProjectRoute} className="group/projects">
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton
            tooltip="Projects"
            className="flex cursor-pointer select-none items-center gap-2"
          >
            <FolderKanban className="size-4 shrink-0" />
            <span className="truncate">Projects</span>
            <ChevronDown
              className="ml-auto size-4 shrink-0 transition-transform duration-200 group-data-[state=open]/projects:rotate-180"
              aria-hidden
            />
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub className="group-data-[collapsible=icon]:hidden">
            {isLoading ? (
              <SidebarMenuSubItem>
                <span className="px-2 py-1.5 text-xs text-sidebar-foreground/70">
                  Loading…
                </span>
              </SidebarMenuSubItem>
            ) : projects.length === 0 ? (
              <SidebarMenuSubItem>
                <span className="px-2 py-1.5 text-xs text-sidebar-foreground/70">
                  No projects
                </span>
              </SidebarMenuSubItem>
            ) : (
              projects.map((project) => {
                const href = routes.project.overview(project.id);
                const isActive =
                  pathname === href || pathname.startsWith(href + "/");
                return (
                  <SidebarMenuSubItem key={project.id}>
                    <SidebarMenuSubButton asChild isActive={isActive}>
                      <Link href={href}>{project.name}</Link>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                );
              })
            )}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
}
