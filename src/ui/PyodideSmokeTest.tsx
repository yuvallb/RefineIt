import { useState } from 'react';

import { usePyodide } from '@/hooks/usePyodide';
import type { PreviewPayload } from '@/lib/types';
import { Button } from '@/ui/components/ui/button';

export function PyodideSmokeTest() {
  const { status, runPython, lastError } = usePyodide();
  const [preview, setPreview] = useState<PreviewPayload | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const handleTest = async () => {
    setIsRunning(true);
    setPreview(null);

    const result = await runPython(`
df = pd.DataFrame({"a": [1, 2, 3]})
preview_df(df)
`);

    setIsRunning(false);

    if (result.result) {
      setPreview(result.result as PreviewPayload);
    }
  };

  return (
    <div className="mt-6 w-full max-w-xl space-y-4">
      <Button
        type="button"
        onClick={() => void handleTest()}
        disabled={isRunning || status === 'loading'}
      >
        {isRunning || status === 'loading' ? 'Running…' : 'Test Pyodide'}
      </Button>

      {lastError && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          <p className="font-medium">{lastError.message}</p>
          {lastError.traceback && (
            <pre className="mt-2 max-h-40 overflow-auto text-xs whitespace-pre-wrap">
              {lastError.traceback}
            </pre>
          )}
        </div>
      )}

      {preview && (
        <div className="rounded-md border border-border bg-card p-3 text-left">
          <p className="text-xs text-muted-foreground">
            {preview.totalRows} rows × {preview.totalColumns} columns
          </p>
          <pre className="mt-2 max-h-48 overflow-auto text-xs">
            {JSON.stringify(preview, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
