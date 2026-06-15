import { describe, expect, it } from 'vitest';

import { derive } from '@/nodes/derive';

describe('derive', () => {
  it('compiles assign with eval', () => {
    const code = derive.compile(
      { column: 'margin', expression: 'revenue * 0.1' },
      ['node_a'],
      'node_b',
      {},
    );
    expect(code).toContain('.assign(**{"margin"');
    expect(code).toContain('.eval("revenue * 0.1")');
  });

  it('requires column and expression', () => {
    expect(derive.validate({ column: '', expression: '' }, [[]])).toHaveLength(2);
  });

  it('rejects duplicate column name', () => {
    const errors = derive.validate(
      { column: 'revenue', expression: 'revenue * 2' },
      [[{ name: 'revenue', dtype: 'int', pandasDtype: 'int64', nullable: false }]],
    );
    expect(errors.some((e) => e.message.includes('already exists'))).toBe(true);
  });
});
