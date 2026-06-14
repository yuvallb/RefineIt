import { beforeEach, describe, expect, it } from 'vitest';

import { KernelClient } from '@/engine/kernel-client';

describe('kernel integration', () => {
  let client: KernelClient;

  beforeEach(() => {
    client = new KernelClient();
  });

  it('loads CSV and returns preview', async () => {
    const csv = 'name,value\nalice,1\nbob,2';
    const bytes = new TextEncoder().encode(csv);

    const result = await client.loadCsv(bytes);

    expect(result.error).toBeUndefined();
    expect(result.preview?.totalRows).toBe(2);
    expect(result.preview?.totalColumns).toBe(2);
    expect(result.preview?.rows.length).toBeLessThanOrEqual(100);
  });

  it('creates DataFrame and returns head preview', async () => {
    const result = await client.runPython(`
df = pd.DataFrame({"a": [1, 2, 3]})
preview_df(df)
`);

    expect(result.error).toBeUndefined();
    const preview = result.result as {
      totalRows: number;
      totalColumns: number;
      rows: unknown[];
    };

    expect(preview.totalRows).toBe(3);
    expect(preview.totalColumns).toBe(1);
    expect(preview.rows).toHaveLength(3);
  });

  it('returns structured error on invalid Python', async () => {
    const result = await client.runPython('def broken(');

    expect(result.result).toBeUndefined();
    expect(result.error?.message).toBeTruthy();
  });

  it('heartbeat responds to ping', async () => {
    const timestamp = await client.ping();
    expect(timestamp).toBeGreaterThan(0);
  });
});
