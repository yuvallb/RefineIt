import { describe, expect, it } from 'vitest';

import { concat } from '@/nodes/concat';

describe('concat', () => {
  it('compiles row concat', () => {
    const code = concat.compile({ axis: 0 }, ['node_a', 'node_b'], 'node_c', {});
    expect(code).toBe('node_c = pd.concat([node_a, node_b], axis=0)');
  });

  it('compiles column concat', () => {
    const code = concat.compile({ axis: 1 }, ['node_a', 'node_b'], 'node_c', {});
    expect(code).toBe('node_c = pd.concat([node_a, node_b], axis=1)');
  });

  it('requires both inputs in schema list', () => {
    expect(concat.validate({ axis: 0 }, [[]])).toHaveLength(1);
  });
});
