import { describe, expect, it } from 'vitest';

import { outliers } from '@/nodes/outliers';

const upstream = [{ name: 'revenue', dtype: 'float' as const, pandasDtype: 'float64', nullable: false }];

describe('outliers', () => {
  it('compiles flag action with outlier column', () => {
    const code = outliers.compile(
      { columns: ['revenue'], method: 'iqr', threshold: 1.5, action: 'flag' },
      ['node_a'],
      'node_b',
      {},
    );
    expect(code).toContain('node_b["revenue_outlier"]');
    expect(code).toContain('quantile(0.25)');
  });

  it('compiles zscore remove action', () => {
    const code = outliers.compile(
      { columns: ['revenue'], method: 'zscore', threshold: 3, action: 'remove' },
      ['node_a'],
      'node_b',
      {},
    );
    expect(code).toContain('.std()');
    expect(code).toContain('[~(');
  });

  it('compiles winsorize action', () => {
    const code = outliers.compile(
      { columns: ['revenue'], method: 'iqr', threshold: 1.5, action: 'winsorize' },
      ['node_a'],
      'node_b',
      {},
    );
    expect(code).toContain('.clip(lower=');
  });

  it('requires columns', () => {
    const errors = outliers.validate({ columns: [] }, [upstream]);
    expect(errors.some((e) => e.message.includes('at least one'))).toBe(true);
  });

  it('validates column exists', () => {
    const errors = outliers.validate({ columns: ['missing'] }, [upstream]);
    expect(errors.some((e) => e.message.includes('not found'))).toBe(true);
  });
});
