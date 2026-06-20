import { createContext } from 'react';

export interface FileImportContextValue {
  ingestFile: (
    file: File,
    position: { x: number; y: number },
    nodeId?: string,
  ) => Promise<void>;
  requestImport: (
    nodeType: 'source.csv' | 'source.json',
    opts?: { nodeId?: string; position?: { x: number; y: number } },
  ) => void;
}

export const FileImportContext = createContext<FileImportContextValue | null>(null);
