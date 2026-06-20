import { describe, expect, it } from 'vitest';

import { reorder } from '@/nodes/reorder';

const upstream = [
  { name: 'b', dtype: 'int' as const, pandasDtype: 'int64', nullable: false },
  { name: 'a', dtype: 'int' as const, pandasDtype: 'int64', nullable: false },
  { name: 'c', dtype: 'string' as const, pandasDtype: 'object', nullable: true },
];

describe('reorder', () => {
  it('compiles reorder with append remainder', () => {
    const code = reorder.compile(
      { columns: ['a', 'b'], appendRemainder: true },
      ['node_in'],
      'node_out',
      {},
    );
    expect(code).toContain('node_out_ordered = ["a", "b"]');
    expect(code).toContain('if c not in node_out_ordered');
  });

  it('requires columns', () => {
    expect(reorder.validate({ columns: [] }, [upstream])).toHaveLength(1);
  });

  it('validates columns exist', () => {
    const errors = reorder.validate({ columns: ['missing'] }, [upstream]);
    expect(errors.some((e) => e.field === 'columns')).toBe(true);
  });
});
