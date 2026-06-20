import { describe, expect, it } from 'vitest';

import { limit } from '@/nodes/limit';

describe('limit', () => {
  it('compiles head', () => {
    const code = limit.compile({ mode: 'head', n: 100 }, ['node_in'], 'node_out', {}, {});
    expect(code).toBe('node_out = node_in.head(100)');
  });

  it('compiles tail', () => {
    const code = limit.compile({ mode: 'tail', n: 5 }, ['node_in'], 'node_out', {}, {});
    expect(code).toBe('node_out = node_in.tail(5)');
  });

  it('compiles slice', () => {
    const code = limit.compile({ mode: 'slice', start: 2, stop: 20 }, ['node_in'], 'node_out', {}, {});
    expect(code).toBe('node_out = node_in.iloc[2:20]');
  });

  it('validates negative n', () => {
    expect(limit.validate({ mode: 'head', n: -1 }, [])).toHaveLength(1);
  });

  it('validates slice bounds', () => {
    expect(limit.validate({ mode: 'slice', start: 10, stop: 5 }, [])).toHaveLength(1);
  });
});
