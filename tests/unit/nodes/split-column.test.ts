import { describe, expect, it } from 'vitest';

import { splitColumn } from '@/nodes/split-column';

const upstream = [
  { name: 'full_name', dtype: 'string' as const, pandasDtype: 'object', nullable: true },
  { name: 'age', dtype: 'int' as const, pandasDtype: 'int64', nullable: false },
];

describe('split.column', () => {
  it('compiles str.split and concat', () => {
    const code = splitColumn.compile(
      { column: 'full_name', pat: ' ', into: ['first', 'last'], expand: true, n: 1 },
      ['node_in'],
      'node_out',
      {},
    );
    expect(code).toContain('.str.split(');
    expect(code).toContain('pd.concat([node_in, node_out_split], axis=1)');
  });

  it('requires column and into names', () => {
    expect(splitColumn.validate({ column: '', into: [] }, [upstream]).length).toBeGreaterThan(0);
  });

  it('validates column exists', () => {
    const errors = splitColumn.validate(
      { column: 'missing', pat: ',', into: ['a'] },
      [upstream],
    );
    expect(errors.some((e) => e.field === 'column')).toBe(true);
  });

  it('warns on non-string column dtype', () => {
    const errors = splitColumn.validate(
      { column: 'age', pat: ',', into: ['a', 'b'] },
      [upstream],
    );
    expect(errors.some((e) => e.message.includes('string-like'))).toBe(true);
  });
});
