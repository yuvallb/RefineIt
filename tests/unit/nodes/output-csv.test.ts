import { describe, expect, it } from 'vitest';

import { outputCsv } from '@/nodes/output-csv';

describe('output.csv', () => {
  it('passes through in execution mode', () => {
    const code = outputCsv.compile(
      { filename: 'out.csv' },
      ['node_in'],
      'node_out',
      {},
      { mode: 'execution' },
    );
    expect(code).toBe('node_out = node_in');
  });

  it('compiles to_csv in export mode', () => {
    const code = outputCsv.compile(
      { filename: 'results.csv' },
      ['node_in'],
      'node_out',
      {},
      { mode: 'export' },
    );
    expect(code).toContain('node_out = node_in');
    expect(code).toContain('.to_csv("results.csv", index=False)');
  });

  it('requires filename', () => {
    expect(outputCsv.validate({ filename: '' }, [])).toHaveLength(1);
    expect(outputCsv.validate({ filename: 'out.csv' }, [])).toHaveLength(0);
  });
});
