import { describe, expect, it } from 'vitest';

import { windowShift } from '@/nodes/window-shift';

const upstream = [
  { name: 'value', dtype: 'float' as const, pandasDtype: 'float64', nullable: false },
  { name: 'group', dtype: 'string' as const, pandasDtype: 'object', nullable: false },
];

describe('windowShift', () => {
  it('compiles lag with partition and order', () => {
    const code = windowShift.compile(
      { column: 'value', periods: -1, partitionBy: ['group'], orderBy: ['value'] },
      ['node_a'],
      'node_b',
      {},
    );
    expect(code).toContain('.sort_values(["value"])');
    expect(code).toContain('.shift(-1)');
    expect(code).toContain('node_b["value_lag_1"]');
    expect(code).toContain('.reindex(node_a.index)');
  });

  it('compiles lead without partition', () => {
    const code = windowShift.compile(
      { column: 'value', periods: 2, partitionBy: [], orderBy: [] },
      ['node_a'],
      'node_b',
      {},
    );
    expect(code).toContain('.shift(2)');
    expect(code).toContain('node_b["value_lead_2"]');
  });

  it('requires column', () => {
    const errors = windowShift.validate({ column: '', periods: -1 }, [upstream]);
    expect(errors.some((e) => e.message.includes('Select a column'))).toBe(true);
  });
});
