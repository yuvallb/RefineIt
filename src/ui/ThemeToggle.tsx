import { Moon, Sun } from 'lucide-react';

import { Button } from '@/ui/components/ui/button';
import { useUiStore } from '@/state/ui-store';

export function ThemeToggle() {
  const colorMode = useUiStore((s) => s.colorMode);
  const toggleColorMode = useUiStore((s) => s.toggleColorMode);
  const isDark = colorMode === 'dark';

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggleColorMode}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-pressed={isDark}
    >
      {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </Button>
  );
}
