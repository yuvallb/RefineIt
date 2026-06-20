import { describe, expect, it } from 'vitest';

import { aiAnonymize } from '@/nodes/ai-anonymize';

const upstream = [{ name: 'email', dtype: 'string' as const, pandasDtype: 'object', nullable: true }];

describe('aiAnonymize', () => {
  it('compile returns copy placeholder with AI comment', () => {
    const code = aiAnonymize.compile(
      { columns: ['email'], method: 'mask' },
      ['node_a'],
      'node_b',
      {},
    );
    expect(code).toContain('node_b = node_a.copy()');
    expect(code).toContain('AI execution on main thread');
  });

  it('validate fails when AI disabled', () => {
    const errors = aiAnonymize.validate({ columns: ['email'] }, [upstream]);
    if (import.meta.env.VITE_ENABLE_AI_NODES !== 'true') {
      expect(errors.some((e) => e.message.includes('AI nodes are disabled'))).toBe(true);
    }
  });

  it('requires columns when AI enabled', () => {
    if (import.meta.env.VITE_ENABLE_AI_NODES !== 'true') return;
    const errors = aiAnonymize.validate({ columns: [] }, [upstream]);
    expect(errors.some((e) => e.message.includes('at least one'))).toBe(true);
  });
});
