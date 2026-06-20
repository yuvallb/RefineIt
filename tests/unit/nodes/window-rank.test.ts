import { describe, expect, it } from 'vitest';

import { windowRank } from '@/nodes/window-rank';

const upstream = [
  { name: 'score', dtype: 'float' as const, pandasDtype: 'float64', nullable: false },
  { name: 'region', dtype: 'string' as const, pandasDtype: 'object', nullable: false },
];

describe('windowRank', () => {
  it('compiles rank within partition', () => {
    const code = windowRank.compile(
      {
        mode: 'rank',
        method: 'dense',
        ascending: true,
        partitionBy: ['region'],
        orderBy: ['score'],
      },
      ['node_a'],
      'node_b',
      {},
    );
    expect(code).toContain('.groupby(["region"])');
    expect(code).toContain('.rank(method="dense"');
  });

  it('compiles row_number', () => {
    const code = windowRank.compile(
      { mode: 'row_number', partitionBy: ['region'], orderBy: [] },
      ['node_a'],
      'node_b',
      {},
    );
    expect(code).toContain('node_b["row_number"]');
    expect(code).toContain('cumcount() + 1');
  });

  it('requires orderBy for rank mode', () => {
    const errors = windowRank.validate({ mode: 'rank', orderBy: [] }, [upstream]);
    expect(errors.some((e) => e.message.includes('order column'))).toBe(true);
  });
});
