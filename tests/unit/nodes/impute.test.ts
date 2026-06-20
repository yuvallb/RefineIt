import { describe, expect, it } from 'vitest';

import { impute } from '@/nodes/impute';

const upstream = [
  { name: 'amount', dtype: 'float' as const, pandasDtype: 'float64', nullable: true },
  { name: 'category', dtype: 'string' as const, pandasDtype: 'object', nullable: true },
  { name: 'region', dtype: 'string' as const, pandasDtype: 'object', nullable: false },
];

describe('impute', () => {
  it('compiles mean imputation', () => {
    const code = impute.compile({ columns: ['amount'], strategy: 'mean' }, ['node_in'], 'node_out', {}, {});
    expect(code).toContain('node_out = node_in.copy()');
    expect(code).toContain('.fillna(node_in["amount"].mean())');
  });

  it('compiles grouped median imputation', () => {
    const code = impute.compile(
      { columns: ['amount'], strategy: 'median', groupBy: ['region'] },
      ['node_in'],
      'node_out',
      {},
    );
    expect(code).toContain('.groupby(["region"])["amount"]');
    expect(code).toContain(".transform('median')");
  });

  it('requires columns', () => {
    expect(impute.validate({ columns: [], strategy: 'mean' }, [upstream])).toHaveLength(1);
  });

  it('rejects mean on string column', () => {
    const errors = impute.validate({ columns: ['category'], strategy: 'mean' }, [upstream]);
    expect(errors.some((e) => e.message.includes('numeric'))).toBe(true);
  });

  it('requires constant value for constant strategy', () => {
    const errors = impute.validate(
      { columns: ['category'], strategy: 'constant', constantValue: '' },
      [upstream],
    );
    expect(errors.some((e) => e.field === 'constantValue')).toBe(true);
  });

  it('validates groupBy columns', () => {
    const errors = impute.validate(
      { columns: ['amount'], strategy: 'mean', groupBy: ['missing'] },
      [upstream],
    );
    expect(errors.some((e) => e.field === 'groupBy')).toBe(true);
  });
});
