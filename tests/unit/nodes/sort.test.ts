import { describe, expect, it } from 'vitest';

import { sort } from '@/nodes/sort';

describe('sort', () => {
  it('compiles sort_values ascending', () => {
    const code = sort.compile(
      { columns: ['revenue', 'region'], direction: 'asc' },
      ['node_a'],
      'node_b',
      {},
    );
    expect(code).toBe(
      'node_b = node_a.sort_values(by=["revenue", "region"], ascending=[True, True])',
    );
  });

  it('compiles sort_values descending', () => {
    const code = sort.compile(
      { columns: ['revenue'], direction: 'desc' },
      ['node_a'],
      'node_b',
      {},
    );
    expect(code).toBe('node_b = node_a.sort_values(by=["revenue"], ascending=[False])');
  });

  it('requires sort columns', () => {
    expect(sort.validate({ columns: [], direction: 'asc' }, [[]])).toHaveLength(1);
  });
});
