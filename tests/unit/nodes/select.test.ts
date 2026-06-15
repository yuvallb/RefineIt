import { describe, expect, it } from 'vitest';

import { select } from '@/nodes/select';

describe('select', () => {
  it('compiles keep columns', () => {
    const code = select.compile(
      { columns: ['revenue', 'region'], mode: 'keep' },
      ['node_a'],
      'node_b',
      {},
    );
    expect(code).toBe('node_b = node_a[["revenue", "region"]]');
  });

  it('compiles drop columns', () => {
    const code = select.compile(
      { columns: ['region'], mode: 'drop' },
      ['node_a'],
      'node_b',
      {},
    );
    expect(code).toBe('node_b = node_a.drop(columns=["region"])');
  });

  it('requires columns', () => {
    expect(select.validate({ columns: [], mode: 'keep' }, [[]])).toHaveLength(1);
  });
});
