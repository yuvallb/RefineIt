import { describe, expect, it } from 'vitest';

import { mergeUpdate } from '@/nodes/merge-update';

const leftSchema = [
  { name: 'id', dtype: 'int' as const, pandasDtype: 'int64', nullable: false },
  { name: 'name', dtype: 'string' as const, pandasDtype: 'object', nullable: false },
];
const rightSchema = [
  { name: 'id', dtype: 'int' as const, pandasDtype: 'int64', nullable: false },
  { name: 'name', dtype: 'string' as const, pandasDtype: 'object', nullable: false },
  { name: 'status', dtype: 'string' as const, pandasDtype: 'object', nullable: false },
];

describe('mergeUpdate', () => {
  it('compiles update pattern', () => {
    const code = mergeUpdate.compile(
      { leftOn: 'id', rightOn: 'id', columnsToUpdate: ['name', 'status'] },
      ['node_left', 'node_right'],
      'node_out',
      {},
    );
    expect(code).toContain('.copy()');
    expect(code).toContain('.set_index(');
    expect(code).toContain('.update(');
    expect(code).toContain('.reset_index()');
  });

  it('requires join keys', () => {
    expect(mergeUpdate.validate({ leftOn: '', rightOn: '' }, [leftSchema, rightSchema])).toHaveLength(
      2,
    );
  });

  it('requires both inputs connected', () => {
    const errors = mergeUpdate.validate(
      { leftOn: 'id', rightOn: 'id', columnsToUpdate: 'all' },
      [leftSchema, rightSchema],
      { inputVarCount: 1 },
    );
    expect(errors.some((e) => e.field === 'inputs')).toBe(true);
  });

  it('validates update columns on right schema', () => {
    const errors = mergeUpdate.validate(
      { leftOn: 'id', rightOn: 'id', columnsToUpdate: ['missing'] },
      [leftSchema, rightSchema],
    );
    expect(errors.some((e) => e.field === 'columnsToUpdate')).toBe(true);
  });
});
