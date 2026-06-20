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

  it('rejects unsupported date parts', () => {
    const errors = dtExtract.validate(
      { column: 'created_at', parts: ['created_at', 'year'] },
      [schema],
    );
    expect(errors.some((e) => e.field === 'parts')).toBe(true);
  });

  it('uses multi-select options for parts', () => {
    const partsField = dtExtract.inspectorSchema().find((field) => field.key === 'parts');
    expect(partsField?.kind).toBe('multi-select');
    if (partsField?.kind === 'multi-select') {
      expect(partsField.options).toContain('year');
      expect(partsField.options).toContain('month');
      expect(partsField.options).not.toContain('created_at');
    }
  });
});
