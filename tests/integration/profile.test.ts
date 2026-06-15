import { beforeEach, describe, expect, it } from 'vitest';

import { KernelClient } from '@/engine/kernel-client';
import { sourceCsv } from '@/nodes/source-csv';
import { sourceJson } from '@/nodes/source-json';

const SALES_CSV = `region,country,revenue,order_id,status
North,US,1500,ORD-0001,completed
South,UK,800,ORD-0002,pending
East,US,2200,ORD-0003,completed
West,CA,500,ORD-0004,pending
North,DE,3200,ORD-0005,completed
South,US,900,ORD-0006,pending
East,UK,1100,ORD-0007,completed
West,US,450,ORD-0008,pending`;

const CUSTOMERS_JSON = JSON.stringify(
  Array.from({ length: 50 }, (_, i) => ({
    id: i + 1,
    name: `Customer ${i + 1}`,
    country: ['US', 'UK', 'CA', 'DE', 'FR'][i % 5],
    revenue: 100 + i * 10,
    status: i % 3 === 0 ? 'pending' : 'active',
  })),
);

const MESSY_CSV = `name,age,score,note
Alice,30,95.5,ok
Bob,,88,
Charlie,not_a_number,72,mixed
,25,,
Diana,40,,missing score`;

const EMPTY_CSV = `region,country,revenue
`;

function encode(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

describe('profile integration', () => {
  let client: KernelClient;

  beforeEach(() => {
    client = new KernelClient();
  });

  it('returns column profiles for CSV source', async () => {
    const bytes = encode(SALES_CSV);
    const code = sourceCsv.compile(
      { filename: 'sales.csv', delimiter: ',', header: true, encoding: 'utf-8' },
      [],
      'node_src',
      {},
      { mode: 'execution' },
    );

    const result = await client.executePipeline({
      params: {},
      nodes: [{ nodeId: 'src', code, isStale: true, csvBytes: bytes }],
    });

    expect(result.error).toBeUndefined();
    const profile = result.nodeResults.src?.profile ?? [];
    expect(profile.length).toBeGreaterThan(0);

    const revenue = profile.find((col) => col.name === 'revenue');
    expect(revenue).toBeDefined();
    expect(revenue?.histogram?.length).toBeLessThanOrEqual(10);
    if (revenue?.min !== undefined && revenue.max !== undefined) {
      expect(revenue.min).toBeLessThanOrEqual(revenue.max as number);
    }

    const status = profile.find((col) => col.name === 'status');
    expect(status?.topValues).toBeDefined();
    expect(Object.keys(status?.topValues ?? {}).length).toBeLessThanOrEqual(10);
  });

  it('loads JSON source and profiles columns', async () => {
    const bytes = encode(CUSTOMERS_JSON);
    const code = sourceJson.compile(
      { filename: 'customers.json', orient: 'records' },
      [],
      'node_src',
      {},
      { mode: 'execution' },
    );

    const result = await client.executePipeline({
      params: {},
      nodes: [{ nodeId: 'src', code, isStale: true, jsonBytes: bytes }],
    });

    expect(result.error).toBeUndefined();
    expect(result.nodeResults.src?.preview?.totalRows).toBe(50);
    expect(result.nodeResults.src?.profile?.length).toBeGreaterThan(0);
  });

  it('parses CSV with custom tab delimiter', async () => {
    const tsv = 'region\tcountry\trevenue\nNorth\tUS\t1500\nSouth\tUK\t800';
    const bytes = encode(tsv);
    const code = sourceCsv.compile(
      { filename: 'data.tsv', delimiter: '\t', header: true, encoding: 'utf-8' },
      [],
      'node_src',
      {},
      { mode: 'execution' },
    );

    const result = await client.executePipeline({
      params: {},
      nodes: [{ nodeId: 'src', code, isStale: true, csvBytes: bytes }],
    });

    expect(result.error).toBeUndefined();
    expect(result.nodeResults.src?.preview?.totalRows).toBe(2);
    expect(result.nodeResults.src?.profile?.length).toBe(3);
  });

  it('handles empty CSV without crashing', async () => {
    const bytes = encode(EMPTY_CSV);
    const code = sourceCsv.compile(
      { filename: 'empty.csv', delimiter: ',', header: true, encoding: 'utf-8' },
      [],
      'node_src',
      {},
      { mode: 'execution' },
    );

    const result = await client.executePipeline({
      params: {},
      nodes: [{ nodeId: 'src', code, isStale: true, csvBytes: bytes }],
    });

    expect(result.error).toBeUndefined();
    expect(result.nodeResults.src?.preview?.totalRows).toBe(0);
    expect(result.nodeResults.src?.profile?.length).toBe(3);
  });

  it('profiles messy CSV with nulls and mixed types', async () => {
    const bytes = encode(MESSY_CSV);
    const code = sourceCsv.compile(
      { filename: 'messy.csv', delimiter: ',', header: true, encoding: 'utf-8' },
      [],
      'node_src',
      {},
      { mode: 'execution' },
    );

    const result = await client.executePipeline({
      params: {},
      nodes: [{ nodeId: 'src', code, isStale: true, csvBytes: bytes }],
    });

    expect(result.error).toBeUndefined();
    const profile = result.nodeResults.src?.profile ?? [];
    expect(profile.length).toBeGreaterThan(0);

    const nameCol = profile.find((col) => col.name === 'name');
    expect(nameCol?.nullCount).toBeGreaterThan(0);
  });

  it('profiles large datasets using row sampling', async () => {
    const header = 'id,value\n';
    const rows = Array.from({ length: 100_001 }, (_, i) => `${i},${i % 100}`).join('\n');
    const bytes = encode(header + rows);
    const code = sourceCsv.compile(
      { filename: 'large.csv', delimiter: ',', header: true, encoding: 'utf-8' },
      [],
      'node_src',
      {},
      { mode: 'execution' },
    );

    const result = await client.executePipeline({
      params: {},
      nodes: [{ nodeId: 'src', code, isStale: true, csvBytes: bytes }],
    });

    expect(result.error).toBeUndefined();
    expect(result.nodeResults.src?.preview?.totalRows).toBe(100_001);
    expect(result.nodeResults.src?.profile?.length).toBe(2);
  });

  it('fetches profile for an already-executed node', async () => {
    const bytes = encode(SALES_CSV);
    const code = sourceCsv.compile(
      { filename: 'sales.csv', delimiter: ',', header: true, encoding: 'utf-8' },
      [],
      'node_src',
      {},
      { mode: 'execution' },
    );

    await client.executePipeline({
      params: {},
      nodes: [{ nodeId: 'src', code, isStale: true, csvBytes: bytes }],
    });

    const profileResult = await client.profileNode('src');
    expect(profileResult.error).toBeUndefined();
    expect(profileResult.profile?.length).toBeGreaterThan(0);
  });
});
