import { describe, expect, it } from 'vitest';

import { pivot } from '@/nodes/pivot';

const schema = [
  { name: 'region', dtype: 'string' as const, pandasDtype: 'object', nullable: false },
  { name: 'product', dtype: 'string' as const, pandasDtype: 'object', nullable: false },
  { name: 'sales', dtype: 'float' as const, pandasDtype: 'float64', nullable: false },
];

describe('pivot', () => {
  it('compiles pivot_table', () => {
    const code = pivot.compile(
      { index: ['region'], columns: 'product', values: 'sales', aggfunc: 'sum', fillValue: 0 },
      ['node_in'],
      'node_out',
      {},
    );
    expect(code).toContain('.pivot_table(');
    expect(code).toContain('index=["region"]');
    expect(code).toContain('columns="product"');
    expect(code).toContain('values="sales"');
    expect(code).toContain('fill_value=0');
  });

  it('requires index, columns, and values', () => {
    expect(pivot.validate({ index: [], columns: '', values: '' }, [schema])).toHaveLength(3);
  });

  it('validates columns exist', () => {
    const errors = pivot.validate(
      { index: ['missing'], columns: 'product', values: 'sales', aggfunc: 'sum' },
      [schema],
    );
    expect(errors.some((e) => e.field === 'index')).toBe(true);
  });

  it('rejects unknown aggfunc', () => {
    const errors = pivot.validate(
      { index: ['region'], columns: 'product', values: 'sales', aggfunc: 'nope' },
      [schema],
    );
    expect(errors.some((e) => e.field === 'aggfunc')).toBe(true);
  });
});
