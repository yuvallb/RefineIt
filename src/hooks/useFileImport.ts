import { useContext } from 'react';

import { FileImportContext, type FileImportContextValue } from '@/hooks/file-import-context';

export function useFileImport(): FileImportContextValue {
  const ctx = useContext(FileImportContext);
  if (!ctx) {
    throw new Error('useFileImport must be used within FileImportProvider');
  }
  return ctx;
}
