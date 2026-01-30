"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, FolderKanban, Settings, Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { routes } from "@/lib/routes";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

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

export function MobileSidebar() {
  const pathname = usePathname();

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm" className="md:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Open menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-64 p-0">
        <SheetHeader className="p-6 pb-4">
          <SheetTitle>Keystone</SheetTitle>
        </SheetHeader>
        <nav className="space-y-1 px-3 pb-6">
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
      </SheetContent>
    </Sheet>
  );
}
