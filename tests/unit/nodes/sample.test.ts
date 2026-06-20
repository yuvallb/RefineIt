import { describe, expect, it } from 'vitest';

import { sample } from '@/nodes/sample';

describe('sample', () => {
  it('compiles sample by n', () => {
    const code = sample.compile(
      { mode: 'n', n: 50, replace: false, randomState: 42 },
      ['node_in'],
      'node_out',
      {},
    );
    expect(code).toBe('node_out = node_in.sample(n=50, replace=False, random_state=42)');
  });

  it('compiles sample by fraction', () => {
    const code = sample.compile(
      { mode: 'frac', frac: 0.25, replace: true },
      ['node_in'],
      'node_out',
      {},
    );
    expect(code).toBe('node_out = node_in.sample(frac=0.25, replace=True)');
  });

  it('validates n mode', () => {
    expect(sample.validate({ mode: 'n', n: 0 }, [])).toHaveLength(1);
    expect(sample.validate({ mode: 'n', n: 10 }, [])).toHaveLength(0);
  });

  it('validates frac mode', () => {
    expect(sample.validate({ mode: 'frac', frac: 1.5 }, [])).toHaveLength(1);
    expect(sample.validate({ mode: 'frac', frac: 0.1 }, [])).toHaveLength(0);
  });
});
