import { describe, expect, it } from 'vitest';

import { strTransform } from '@/nodes/str-transform';

const schema = [
  { name: 'email', dtype: 'string' as const, pandasDtype: 'object', nullable: false },
];

describe('strTransform', () => {
  it('compiles chained str operations', () => {
    const code = strTransform.compile(
      {
        column: 'email',
        operations: [{ op: 'strip' }, { op: 'lower' }],
      },
      ['node_in'],
      'node_out',
      {},
    );
    expect(code).toContain('.assign(');
    expect(code).toContain('.str.strip()');
    expect(code).toContain('.str.lower()');
  });

  it('requires column and operations', () => {
    expect(strTransform.validate({ column: '', operations: [] }, [schema])).toHaveLength(2);
  });

  it('validates column exists', () => {
    const errors = strTransform.validate(
      { column: 'missing', operations: [{ op: 'lower' }] },
      [schema],
    );
    expect(errors.some((e) => e.field === 'column')).toBe(true);
  });
});
