import { Share2, Download } from 'lucide-react';

import { Button } from '@/ui/components/ui/button';

export function Header() {
  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-border bg-card px-4">
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground">
          T
        </span>
        <span className="text-sm font-semibold tracking-tight">Transform Studio</span>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" disabled aria-label="Share workflow">
          <Share2 className="size-4" />
          Share
        </Button>
        <Button variant="outline" size="sm" disabled aria-label="Export code">
          <Download className="size-4" />
          Export
        </Button>
      </div>
    </header>
  );
}
