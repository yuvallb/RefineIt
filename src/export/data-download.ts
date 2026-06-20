import { kernelClient } from '@/engine/kernel-client';
import type { OutputFormat } from '@/nodes/output-utils';

function triggerBlobDownload(content: BlobPart, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function downloadNodeOutput(
  nodeId: string,
  format: OutputFormat,
  filename: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const result = await kernelClient.exportNodeOutput(nodeId, format);

  if (result.error || result.data === undefined) {
    return { ok: false, message: result.error?.message ?? 'Export failed' };
  }

  const mime =
    format === 'csv'
      ? 'text/csv;charset=utf-8'
      : format === 'json'
        ? 'application/json;charset=utf-8'
        : 'application/octet-stream';
  const safeName = filename.trim() || `pipeline_output.${format}`;
  triggerBlobDownload(result.data, safeName, mime);
  return { ok: true };
}
