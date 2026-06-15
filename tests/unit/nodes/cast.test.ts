import { describe, expect, it } from 'vitest';

import { cast } from '@/nodes/cast';

describe('cast', () => {
  it('compiles astype mapping', () => {
    const code = cast.compile(
      { mapping: { revenue: 'float64', region: 'str' } },
      ['node_a'],
      'node_b',
      {},
    );
    expect(code).toBe('node_b = node_a.astype({"revenue": "float64", "region": "str"})');
  });

  it('requires at least one mapping entry', () => {
    expect(cast.validate({ mapping: {} }, [[]])).toHaveLength(1);
  });

  it('rejects unknown columns', () => {
    const errors = cast.validate(
      { mapping: { missing: 'int64' } },
      [[{ name: 'revenue', dtype: 'int', pandasDtype: 'int64', nullable: false }]],
    );
    expect(errors.some((e) => e.message.includes('missing'))).toBe(true);
  });
});
