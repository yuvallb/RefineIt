export interface ColumnSchema {
  name: string;
  dtype: string;
  nullable: boolean;
}

export interface PreviewPayload {
  columns: ColumnSchema[];
  rows: Record<string, unknown>[];
  totalRows: number;
  totalColumns: number;
}

export interface StructuredError {
  message: string;
  traceback?: string;
  nodeId?: string;
}

export interface LoadCsvOptions {
  delimiter?: string;
  header?: boolean;
  encoding?: string;
}

export type KernelStatus = 'idle' | 'loading' | 'ready' | 'error' | 'crashed';

export interface RunPythonResult {
  result?: unknown;
  error?: StructuredError;
}

export interface LoadCsvResult {
  preview?: PreviewPayload;
  error?: StructuredError;
}
