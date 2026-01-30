export function AppHeader() {
  return (
    <header className="border-b bg-background">
      <div className="flex h-16 items-center px-6">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-semibold">Keystone</h1>
        </div>
        <div className="ml-auto flex items-center gap-4">
          <span className="text-sm text-muted-foreground">App Header</span>
        </div>
      </div>
    </header>
  );
}
