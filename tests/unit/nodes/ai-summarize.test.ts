import { describe, expect, it } from 'vitest';

import { aiSummarize } from '@/nodes/ai-summarize';

const upstream = [{ name: 'notes', dtype: 'string' as const, pandasDtype: 'object', nullable: true }];

describe('aiSummarize', () => {
  it('compile returns copy placeholder with AI comment', () => {
    const code = aiSummarize.compile({ scope: 'dataset' }, ['node_a'], 'node_b', {});
    expect(code).toContain('node_b = node_a.copy()');
    expect(code).toContain('AI execution on main thread');
  });

  it('validate fails when AI disabled', () => {
    const errors = aiSummarize.validate({ scope: 'dataset' }, [upstream]);
    if (import.meta.env.VITE_ENABLE_AI_NODES !== 'true') {
      expect(errors.some((e) => e.message.includes('AI nodes are disabled'))).toBe(true);
    }
  });

  it('requires column for column scope when AI enabled', () => {
    if (import.meta.env.VITE_ENABLE_AI_NODES !== 'true') return;
    const errors = aiSummarize.validate({ scope: 'column', column: '' }, [upstream]);
    expect(errors.some((e) => e.message.includes('Select a column'))).toBe(true);
  });
});
