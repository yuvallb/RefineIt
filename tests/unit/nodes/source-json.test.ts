import { describe, expect, it } from 'vitest';

import { sourceJson } from '@/nodes/source-json';

describe('source.json', () => {
  it('validates missing filename', () => {
    expect(sourceJson.validate({}, [])).toHaveLength(1);
  });

  it('compiles read_json for execution', () => {
    const code = sourceJson.compile(
      { filename: 'data.json', orient: 'records' },
      [],
      'node_abc',
      {},
      { mode: 'execution' },
    );
    expect(code).toContain("pd.read_json('/tmp/node_abc.json'");
    expect(code).toContain('orient="records"');
  });

  it('compiles read_json for export', () => {
    const code = sourceJson.compile(
      { filename: 'data.json', orient: 'records' },
      [],
      'node_abc',
      {},
      { mode: 'export' },
    );
    expect(code).toContain('pd.read_json("data.json"');
  });
});
