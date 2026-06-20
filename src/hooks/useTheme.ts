import { useEffect } from 'react';

import { applyColorModeToDocument } from '@/lib/theme';
import { useUiStore } from '@/state/ui-store';

export function useTheme(): void {
  const colorMode = useUiStore((s) => s.colorMode);

  useEffect(() => {
    applyColorModeToDocument(colorMode);
  }, [colorMode]);
}
