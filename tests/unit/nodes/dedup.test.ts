import { describe, expect, it } from 'vitest';

import { dedup } from '@/nodes/dedup';

const upstream = [
  { name: 'id', dtype: 'int' as const, pandasDtype: 'int64', nullable: false },
  { name: 'name', dtype: 'string' as const, pandasDtype: 'object', nullable: true },
];

describe('dedup', () => {
  it('compiles drop_duplicates with subset', () => {
    const code = dedup.compile({ subset: ['id'], keep: 'first' }, ['node_in'], 'node_out', {}, {});
    expect(code).toBe('node_out = node_in.drop_duplicates(subset=["id"], keep="first")');
  });

  it('compiles keep=false', () => {
    const code = dedup.compile({ subset: [], keep: false }, ['node_in'], 'node_out', {}, {});
    expect(code).toBe('node_out = node_in.drop_duplicates(keep=False)');
  });

  it('validates subset columns', () => {
    const errors = dedup.validate({ subset: ['missing'], keep: 'first' }, [upstream]);
    expect(errors.some((e) => e.field === 'subset')).toBe(true);
  });

  it('accepts valid subset', () => {
    expect(dedup.validate({ subset: ['id'], keep: 'last' }, [upstream])).toHaveLength(0);
  });
});
