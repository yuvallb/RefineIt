import { usePyodide } from '@/hooks/usePyodide';

function statusLabel(status: string, progressStage: string): string {
  switch (status) {
    case 'loading':
      return progressStage || 'Loading…';
    case 'ready':
      return 'Python ready';
    case 'error':
      return 'Python error';
    case 'crashed':
      return 'Python crashed — restarting…';
    default:
      return 'Ready';
  }
}

export function Footer() {
  const { status, progressStage } = usePyodide();
  const label = statusLabel(status, progressStage);

  return (
    <footer className="flex h-8 shrink-0 items-center border-t border-border bg-card px-4">
      <span className="text-xs text-muted-foreground">{label}</span>
    </footer>
  );
}
