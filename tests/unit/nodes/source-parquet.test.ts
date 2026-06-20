import { describe, expect, it } from 'vitest';

import { sourceParquet } from '@/nodes/source-parquet';

describe('source.parquet', () => {
  it('validates missing filename', () => {
    expect(sourceParquet.validate({}, [])).toHaveLength(1);
  });

  it('compiles read_parquet for execution', () => {
    const code = sourceParquet.compile(
      { filename: 'data.parquet', columns: ['a', 'b'] },
      [],
      'node_abc',
      {},
      { mode: 'execution' },
    );
    expect(code).toContain("pd.read_parquet('/tmp/node_abc.parquet'");
    expect(code).toContain('columns=["a", "b"]');
  });

  it('compiles read_parquet for export', () => {
    const code = sourceParquet.compile(
      { filename: 'data.parquet' },
      [],
      'node_abc',
      {},
      { mode: 'export' },
    );
    expect(code).toBe('node_abc = pd.read_parquet("data.parquet")');
  });
});
