import { describe, expect, it } from 'vitest';

import { aiClassify } from '@/nodes/ai-classify';

const upstream = [{ name: 'text', dtype: 'string' as const, pandasDtype: 'object', nullable: true }];

describe('aiClassify', () => {
  it('compile returns copy placeholder with AI comment', () => {
    const code = aiClassify.compile(
      { column: 'text', labels: ['pos', 'neg'] },
      ['node_a'],
      'node_b',
      {},
    );
    expect(code).toBe(
      'node_b = node_a.copy()  # AI execution on main thread; column injected at runtime',
    );
  });

  it('validate fails when AI disabled', () => {
    const errors = aiClassify.validate(
      { column: 'text', labels: ['pos'] },
      [upstream],
    );
    if (import.meta.env.VITE_ENABLE_AI_NODES === 'true') {
      expect(errors).toHaveLength(0);
    } else {
      expect(errors.some((e) => e.message.includes('AI nodes are disabled'))).toBe(true);
    }
  });

  it('hiddenInPalette reflects feature flag', () => {
    expect(aiClassify.hiddenInPalette).toBe(import.meta.env.VITE_ENABLE_AI_NODES !== 'true');
  });
});
