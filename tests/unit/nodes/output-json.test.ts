import { describe, expect, it } from 'vitest';

import { outputJson } from '@/nodes/output-json';

describe('output.json', () => {
  it('passes through in execution mode', () => {
    const code = outputJson.compile(
      { filename: 'out.json', orient: 'records' },
      ['node_in'],
      'node_out',
      {},
      { mode: 'execution' },
    );
    expect(code).toBe('node_out = node_in');
  });

  it('compiles to_json in export mode', () => {
    const code = outputJson.compile(
      { filename: 'results.json', orient: 'records' },
      ['node_in'],
      'node_out',
      {},
      { mode: 'export' },
    );
    expect(code).toContain('.to_json("results.json"');
    expect(code).toContain('orient="records"');
  });

  it('requires filename', () => {
    expect(outputJson.validate({ filename: '' }, [])).toHaveLength(1);
  });
});
