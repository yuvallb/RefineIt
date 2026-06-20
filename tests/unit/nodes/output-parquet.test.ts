import { describe, expect, it } from 'vitest';

import { outputParquet } from '@/nodes/output-parquet';

describe('output.parquet', () => {
  it('passes through in execution mode', () => {
    const code = outputParquet.compile(
      { filename: 'out.parquet' },
      ['node_in'],
      'node_out',
      {},
      { mode: 'execution' },
    );
    expect(code).toBe('node_out = node_in');
  });

  it('compiles to_parquet with size warning in export mode', () => {
    const code = outputParquet.compile(
      { filename: 'results.parquet' },
      ['node_in'],
      'node_out',
      {},
      { mode: 'export' },
    );
    expect(code).toContain('>50 MB');
    expect(code).toContain('.to_parquet("results.parquet", index=False)');
  });

  it('requires filename', () => {
    expect(outputParquet.validate({ filename: '' }, [])).toHaveLength(1);
  });
});
