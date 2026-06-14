export function Sidebar() {
  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-border bg-card">
      <div className="border-b border-border px-3 py-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Node Library
        </p>
      </div>
      <div className="flex flex-1 items-center justify-center p-4">
        <p className="text-center text-xs text-muted-foreground">
          Node palette will appear here in a future milestone.
        </p>
      </div>
    </aside>
  );
}
