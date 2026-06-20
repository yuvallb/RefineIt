import { describe, expect, it } from 'vitest';

import { findDuplicates } from '@/nodes/find-duplicates';

const upstream = [
  { name: 'id', dtype: 'int' as const, pandasDtype: 'int64', nullable: false },
  { name: 'email', dtype: 'string' as const, pandasDtype: 'object', nullable: true },
];

describe('findDuplicates', () => {
  it('compiles flag column output', () => {
    const code = findDuplicates.compile(
      { subset: ['email'], keep: 'first', output: 'flag_column' },
      ['node_a'],
      'node_b',
      {},
    );
    expect(code).toContain("node_b['_duplicate'] = node_a.duplicated(subset=[\"email\"], keep=\"first\")");
  });

  it('compiles duplicates_only output', () => {
    const code = findDuplicates.compile(
      { subset: [], keep: false, output: 'duplicates_only' },
      ['node_a'],
      'node_b',
      {},
    );
    expect(code).toBe('node_b = node_a[node_a.duplicated(keep=False)].copy()');
  });

  it('validates subset columns exist', () => {
    const errors = findDuplicates.validate({ subset: ['missing'] }, [upstream]);
    expect(errors.some((e) => e.message.includes('not found'))).toBe(true);
  });
});
