import { describe, expect, it } from 'vitest';

import { rename } from '@/nodes/rename';

describe('rename', () => {
  it('compiles rename mapping', () => {
    const code = rename.compile(
      { mapping: { revenue: 'total_revenue' } },
      ['node_a'],
      'node_b',
      {},
    );
    expect(code).toBe('node_b = node_a.rename(columns={"revenue": "total_revenue"})');
  });

  it('requires mapping entries', () => {
    expect(rename.validate({ mapping: {} }, [[]])).toHaveLength(1);
  });

  it('rejects duplicate target names', () => {
    const errors = rename.validate(
      { mapping: { a: 'x', b: 'x' } },
      [
        [
          { name: 'a', dtype: 'int', pandasDtype: 'int64', nullable: false },
          { name: 'b', dtype: 'int', pandasDtype: 'int64', nullable: false },
        ],
      ],
    );
    expect(errors.some((e) => e.message.includes('Duplicate'))).toBe(true);
  });
});
