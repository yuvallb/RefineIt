import { describe, expect, it } from 'vitest';

import { mergeColumns } from '@/nodes/merge-columns';

const upstream = [
  { name: 'first', dtype: 'string' as const, pandasDtype: 'object', nullable: true },
  { name: 'last', dtype: 'string' as const, pandasDtype: 'object', nullable: true },
];

describe('merge.columns', () => {
  it('compiles assign with agg join', () => {
    const code = mergeColumns.compile(
      { columns: ['first', 'last'], separator: ' ', into: 'full_name', dropSource: false },
      ['node_in'],
      'node_out',
      {},
    );
    expect(code).toContain('node_out["full_name"] =');
    expect(code).toContain('.agg(" ".join, axis=1)');
  });

  it('drops source columns when configured', () => {
    const code = mergeColumns.compile(
      { columns: ['first', 'last'], separator: '-', into: 'full', dropSource: true },
      ['node_in'],
      'node_out',
      {},
    );
    expect(code).toContain('.drop(columns=');
  });

  it('requires at least two columns', () => {
    expect(mergeColumns.validate({ columns: ['first'], into: 'full' }, [upstream])).toHaveLength(1);
  });

  it('validates columns exist', () => {
    const errors = mergeColumns.validate(
      { columns: ['first', 'missing'], into: 'full' },
      [upstream],
    );
    expect(errors.some((e) => e.field === 'columns')).toBe(true);
  });
});
