import { describe, expect, it } from 'vitest';

import { dtCalc } from '@/nodes/dt-calc';

const schema = [
  { name: 'start_date', dtype: 'datetime' as const, pandasDtype: 'datetime64[ns]', nullable: false },
  { name: 'end_date', dtype: 'datetime' as const, pandasDtype: 'datetime64[ns]', nullable: false },
];

describe('dtCalc', () => {
  it('compiles add timedelta', () => {
    const code = dtCalc.compile(
      { mode: 'add', column: 'start_date', amount: 7, unit: 'days' },
      ['node_in'],
      'node_out',
      {},
    );
    expect(code).toContain('Timedelta');
    expect(code).toContain('.assign(');
  });

  it('compiles diff', () => {
    const code = dtCalc.compile(
      { mode: 'diff', column: 'start_date' },
      ['node_in'],
      'node_out',
      {},
    );
    expect(code).toContain('.diff()');
  });

  it('compiles age from now', () => {
    const code = dtCalc.compile(
      { mode: 'age', column: 'start_date', reference: 'now' },
      ['node_in'],
      'node_out',
      {},
    );
    expect(code).toContain('Timestamp.now()');
    expect(code).toContain('/ 365.25');
  });

  it('requires column', () => {
    expect(dtCalc.validate({ mode: 'add', column: '' }, [schema])).toHaveLength(1);
  });

  it('requires reference column for age mode', () => {
    const errors = dtCalc.validate(
      { mode: 'age', column: 'start_date', reference: 'column', referenceColumn: '' },
      [schema],
    );
    expect(errors.some((e) => e.field === 'referenceColumn')).toBe(true);
  });
});
