import { describe, expect, it } from 'vitest';

import { dropna } from '@/nodes/dropna';

describe('dropna', () => {
  it('compiles dropna without subset', () => {
    const code = dropna.compile({ columns: [], how: 'any' }, ['node_a'], 'node_b', {});
    expect(code).toBe('node_b = node_a.dropna(how="any")');
  });

  it('compiles dropna with subset', () => {
    const code = dropna.compile(
      { columns: ['revenue', 'region'], how: 'all' },
      ['node_a'],
      'node_b',
      {},
    );
    expect(code).toBe('node_b = node_a.dropna(subset=["revenue", "region"], how="all")');
  });
});
