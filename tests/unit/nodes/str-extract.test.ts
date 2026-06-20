import { describe, expect, it } from 'vitest';

import { strExtract } from '@/nodes/str-extract';

const schema = [
  { name: 'contact', dtype: 'string' as const, pandasDtype: 'object', nullable: false },
];

describe('strExtract', () => {
  it('compiles str.extract', () => {
    const code = strExtract.compile(
      {
        column: 'contact',
        patterns: [{ name: 'email', regex: String.raw`[\w.+-]+@[\w.-]+\.\w+` }],
      },
      ['node_in'],
      'node_out',
      {},
    );
    expect(code).toContain('.assign(');
  });

  it('requires column and patterns', () => {
    expect(strExtract.validate({ column: '', patterns: [] }, [schema])).toHaveLength(2);
  });

  it('rejects unsafe regex', () => {
    const errors = strExtract.validate(
      {
        column: 'contact',
        patterns: [{ name: 'bad', regex: '(a+)+b' }],
      },
      [schema],
    );
    expect(errors.some((e) => e.field === 'patterns')).toBe(true);
  });
});
