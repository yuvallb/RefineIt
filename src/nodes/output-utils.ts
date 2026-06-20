export type OutputFormat = 'csv' | 'json' | 'parquet';

export function replaceFilenameExtension(filename: string, format: OutputFormat): string {
  const ext = format === 'parquet' ? 'parquet' : format;
  const lastDot = filename.lastIndexOf('.');
  if (lastDot <= 0) {
    return `${filename}.${ext}`;
  }
  return `${filename.slice(0, lastDot)}.${ext}`;
}

export function outputFormatFromNodeType(type: string): OutputFormat | null {
  if (type === 'output.csv') return 'csv';
  if (type === 'output.json') return 'json';
  if (type === 'output.parquet') return 'parquet';
  return null;
}
