import { createContext } from 'react';

import type { KernelStatus, LoadCsvOptions, LoadCsvResult, StructuredError } from '@/lib/types';

export interface PyodideContextValue {
  status: KernelStatus;
  progressStage: string;
  lastError: StructuredError | null;
  init: () => Promise<void>;
  loadCsv: (bytes: Uint8Array, options?: LoadCsvOptions) => Promise<LoadCsvResult>;
  restart: () => Promise<void>;
}

export const PyodideContext = createContext<PyodideContextValue | null>(null);
