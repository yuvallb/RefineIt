import { describe, expect, it } from 'vitest';

import { validateNode } from '@/nodes/validate-node';

const upstream = [{ name: 'email', dtype: 'string' as const, pandasDtype: 'object', nullable: true }];

describe('validateNode', () => {
  it('compiles flag mode with _valid column', () => {
    const code = validateNode.compile(
      {
        mode: 'flag',
        rules: [{ column: 'email', check: 'email' }],
      },
      ['node_a'],
      'node_b',
      {},
    );
    expect(code).toContain("node_b = node_a.copy()");
    expect(code).toContain("node_b['_valid'] = _valid_mask");
    expect(code).toContain('.str.match(');
  });

  it('compiles filter mode', () => {
    const code = validateNode.compile(
      {
        mode: 'filter',
        rules: [{ column: 'email', check: 'not_null' }],
      },
      ['node_a'],
      'node_b',
      {},
    );
    expect(code).toBe('node_b = node_a[node_a["email"].notna()].copy()');
  });

  it('compiles fail mode with raise', () => {
    const code = validateNode.compile(
      {
        mode: 'fail',
        rules: [{ column: 'email', check: 'not_null' }],
      },
      ['node_a'],
      'node_b',
      {},
    );
    expect(code).toContain('raise ValueError');
  });

  it('requires at least one rule', () => {
    const errors = validateNode.validate({ rules: [], mode: 'flag' }, [upstream]);
    expect(errors.some((e) => e.message.includes('at least one'))).toBe(true);
  });

  it('validates column exists upstream', () => {
    const errors = validateNode.validate(
      {
        mode: 'flag',
        rules: [{ column: 'missing', check: 'email' }],
      },
      [upstream],
    );
    expect(errors.some((e) => e.message.includes('not found'))).toBe(true);
  });

  it('requires regex pattern for regex check', () => {
    const errors = validateNode.validate(
      {
        mode: 'flag',
        rules: [{ column: 'email', check: 'regex', args: {} }],
      },
      [upstream],
    );
    expect(errors.some((e) => e.message.includes('pattern'))).toBe(true);
  });

  it('rejects non-numeric range bounds', () => {
    const errors = validateNode.validate(
      {
        mode: 'flag',
        rules: [{ column: 'email', check: 'range', args: { min: '0); import os', max: 100 } }],
      },
      [upstream],
    );
    expect(errors.some((e) => e.message.includes('numeric min and max'))).toBe(true);
  });

  it('compiles range with numeric literals only', () => {
    const code = validateNode.compile(
      {
        mode: 'flag',
        rules: [{ column: 'email', check: 'range', args: { min: 0, max: 100 } }],
      },
      ['node_a'],
      'node_b',
      {},
    );
    expect(code).toContain('>= 0');
    expect(code).toContain('<= 100');
    expect(code).not.toContain('import');
  });
});
