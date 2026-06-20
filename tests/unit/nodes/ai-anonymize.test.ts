import { describe, expect, it } from 'vitest';

import { aiAnonymize } from '@/nodes/ai-anonymize';

const upstream = [{ name: 'email', dtype: 'string' as const, pandasDtype: 'object', nullable: true }];

describe('aiAnonymize', () => {
  it('compiles mask with preserve length', () => {
    const code = aiAnonymize.compile(
      { columns: ['email'], method: 'mask', preserveFormat: true },
      ['node_a'],
      'node_b',
      {},
    );
    expect(code).toContain('anonymize_mask');
    expect(code).toContain('preserve_length=True');
  });

  it('compiles hash with salt from params', () => {
    const code = aiAnonymize.compile(
      { columns: ['email'], method: 'hash' },
      ['node_a'],
      'node_b',
      { _anonymizeSalt: 'test-salt' },
    );
    expect(code).toContain('anonymize_hash');
    expect(code).toContain('"test-salt"');
  });

  it('compiles regex redaction', () => {
    const code = aiAnonymize.compile(
      { columns: ['email'], method: 'regex', regexPreset: 'email', replacement: '[REDACTED]' },
      ['node_a'],
      'node_b',
      {},
    );
    expect(code).toContain('.str.replace(');
    expect(code).toContain('[REDACTED]');
  });

  it('validate rejects llm_rewrite', () => {
    const errors = aiAnonymize.validate(
      { columns: ['email'], method: 'llm_rewrite' },
      [upstream],
    );
    expect(errors.some((e) => e.message.includes('Not implemented yet'))).toBe(true);
  });

  it('requires columns for local methods', () => {
    const errors = aiAnonymize.validate({ columns: [], method: 'mask' }, [upstream]);
    expect(errors.some((e) => e.message.includes('at least one'))).toBe(true);
  });

  it('is visible in palette without feature flag', () => {
    expect(aiAnonymize.hiddenInPalette).toBeFalsy();
  });
});
