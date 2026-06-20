import { useContext } from 'react';

import { PyodideContext, type PyodideContextValue } from '@/hooks/pyodide-context';

export function usePyodide(): PyodideContextValue {
  const context = useContext(PyodideContext);

  if (!context) {
    throw new Error('usePyodide must be used within a PyodideProvider');
  }

  return context;
}
