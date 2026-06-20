import { describe, expect, it } from 'vitest';

import { dtExtract } from '@/nodes/dt-extract';

const schema = [
  { name: 'created_at', dtype: 'datetime' as const, pandasDtype: 'datetime64[ns]', nullable: false },
];

describe('dtExtract', () => {
  it('compiles dt accessors', () => {
    const code = dtExtract.compile(
      { column: 'created_at', parts: ['year', 'month'], parse: false },
      ['node_in'],
      'node_out',
      {},
    );
    expect(code).toContain('.dt.year');
    expect(code).toContain('.dt.month');
    expect(code).toContain('.assign(');
  });

  it('compiles parse when enabled', () => {
    const code = dtExtract.compile(
      { column: 'created_at', parts: ['year'], parse: true, format: '%Y-%m-%d' },
      ['node_in'],
      'node_out',
      {},
    );
    expect(code).toContain('pd.to_datetime(');
    expect(code).toContain('format="%Y-%m-%d"');
  });

  it('requires column and parts', () => {
    expect(dtExtract.validate({ column: '', parts: [] }, [schema])).toHaveLength(2);
  });

  it('validates column exists', () => {
    const errors = dtExtract.validate(
      { column: 'missing', parts: ['year'] },
      [schema],
    );
    expect(errors.some((e) => e.field === 'column')).toBe(true);
  });
});
