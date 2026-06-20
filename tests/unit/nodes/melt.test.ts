import { describe, expect, it } from 'vitest';

import { melt } from '@/nodes/melt';

const schema = [
  { name: 'id', dtype: 'int' as const, pandasDtype: 'int64', nullable: false },
  { name: 'Q1', dtype: 'float' as const, pandasDtype: 'float64', nullable: false },
  { name: 'Q2', dtype: 'float' as const, pandasDtype: 'float64', nullable: false },
];

describe('melt', () => {
  it('compiles melt with id and value vars', () => {
    const code = melt.compile(
      { idVars: ['id'], valueVars: ['Q1', 'Q2'], varName: 'quarter', valueName: 'amount' },
      ['node_in'],
      'node_out',
      {},
    );
    expect(code).toContain('.melt(');
    expect(code).toContain('id_vars=["id"]');
    expect(code).toContain('value_vars=["Q1", "Q2"]');
    expect(code).toContain('var_name="quarter"');
    expect(code).toContain('value_name="amount"');
  });

  it('requires id columns', () => {
    expect(melt.validate({ idVars: [], valueVars: ['Q1'] }, [schema])).toHaveLength(1);
  });

  it('validates id and value columns', () => {
    const errors = melt.validate({ idVars: ['missing'], valueVars: ['Q1'] }, [schema]);
    expect(errors.some((e) => e.field === 'idVars')).toBe(true);
  });
});
