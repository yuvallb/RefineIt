import { describe, expect, it } from 'vitest';

import { windowRolling } from '@/nodes/window-rolling';

const upstream = [
  { name: 'date', dtype: 'datetime' as const, pandasDtype: 'datetime64[ns]', nullable: false },
  { name: 'revenue', dtype: 'float' as const, pandasDtype: 'float64', nullable: false },
  { name: 'region', dtype: 'string' as const, pandasDtype: 'object', nullable: false },
];

describe('windowRolling', () => {
  it('compiles rolling mean without partition', () => {
    const code = windowRolling.compile(
      { mode: 'rolling', column: 'revenue', window: 7, agg: 'mean', groupBy: [] },
      ['node_a'],
      'node_b',
      {},
    );
    expect(code).toContain('node_b["revenue_mean_rolling"]');
    expect(code).toContain('rolling(7, min_periods=1).mean()');
  });

  it('compiles expanding sum with groupBy', () => {
    const code = windowRolling.compile(
      { mode: 'expanding', column: 'revenue', window: 3, agg: 'sum', groupBy: ['region'] },
      ['node_a'],
      'node_b',
      {},
    );
    expect(code).toContain('.groupby(["region"])');
    expect(code).toContain('expanding(min_periods=1).sum()');
  });

  it('requires column', () => {
    const errors = windowRolling.validate({ column: '', window: 3 }, [upstream]);
    expect(errors.some((e) => e.message.includes('Select a column'))).toBe(true);
  });

  it('requires window >= 1', () => {
    const errors = windowRolling.validate({ column: 'revenue', window: 0 }, [upstream]);
    expect(errors.some((e) => e.message.includes('at least 1'))).toBe(true);
  });
});
