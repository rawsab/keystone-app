"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, FolderKanban, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { routes } from "@/lib/routes";

const navItems = [
  {
    label: "Dashboard",
    href: routes.app.dashboard,
    icon: Home,
  },
  {
    label: "Projects",
    href: routes.app.projects,
    icon: FolderKanban,
  },
  {
    label: "Settings",
    href: routes.app.settings,
    icon: Settings,
  },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-64 flex-col border-r bg-background">
      <div className="p-6">
        <h2 className="text-lg font-semibold">Keystone</h2>
        <p className="text-sm text-muted-foreground">Construction Management</p>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== routes.app.dashboard &&
              pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground",
              )}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
