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
        <div className="flex w-full min-w-0 items-center">
          <SidebarMenuButton
            asChild
            tooltip="Projects"
            isActive={pathname === routes.app.projects}
            className="flex-1 min-w-0"
          >
            <Link href={routes.app.projects}>
              <FolderKanban className="size-4 shrink-0" />
              <span className="truncate">Projects</span>
            </Link>
          </SidebarMenuButton>
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="shrink-0 rounded-md p-2 outline-hidden ring-sidebar-ring hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 [&>svg]:size-4 group-data-[collapsible=icon]:hidden"
              aria-label={
                isProjectRoute ? "Collapse projects" : "Expand projects"
              }
            >
              <ChevronDown
                className="size-4 shrink-0 transition-transform duration-200 group-data-[state=open]/projects:rotate-180"
                aria-hidden
              />
            </button>
          </CollapsibleTrigger>
        </div>
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
