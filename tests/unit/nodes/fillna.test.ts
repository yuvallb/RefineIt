import { describe, expect, it } from 'vitest';

import { fillna } from '@/nodes/fillna';

describe('fillna', () => {
  it('compiles fillna for all columns', () => {
    const code = fillna.compile({ columns: [], value: 0 }, ['node_a'], 'node_b', {});
    expect(code).toBe('node_b = node_a.fillna(0)');
  });

  it('compiles fillna for selected columns', () => {
    const code = fillna.compile(
      { columns: ['revenue'], value: 'unknown' },
      ['node_a'],
      'node_b',
      {},
    );
    expect(code).toBe('node_b = node_a.fillna({col: "unknown" for col in ["revenue"]})');
  });
});
