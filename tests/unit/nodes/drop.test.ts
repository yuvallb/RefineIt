import { describe, expect, it } from 'vitest';

import { drop } from '@/nodes/drop';

const upstream = [
  { name: 'keep_me', dtype: 'int' as const, pandasDtype: 'int64', nullable: false },
  { name: 'drop_me', dtype: 'string' as const, pandasDtype: 'object', nullable: true },
];

describe('drop', () => {
  it('compiles drop with errors=raise', () => {
    const code = drop.compile({ columns: ['drop_me'] }, ['node_in'], 'node_out', {}, {});
    expect(code).toBe('node_out = node_in.drop(columns=["drop_me"], errors=\'raise\')');
  });

  it('requires columns', () => {
    expect(drop.validate({ columns: [] }, [upstream])).toHaveLength(1);
  });

  it('validates columns exist', () => {
    const errors = drop.validate({ columns: ['missing'] }, [upstream]);
    expect(errors.some((e) => e.field === 'columns')).toBe(true);
  });
});
