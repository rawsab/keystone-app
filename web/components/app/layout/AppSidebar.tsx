import Link from "next/link";

export function AppSidebar() {
  return (
    <aside className="w-64 border-r bg-background">
      <div className="flex h-full flex-col">
        <div className="flex-1 overflow-auto p-4">
          <nav className="space-y-2">
            <Link
              href="/app"
              className="block rounded-md px-3 py-2 text-sm font-medium hover:bg-accent"
            >
              Dashboard
            </Link>
          </nav>
        </div>
      </div>
    </aside>
  );
}
