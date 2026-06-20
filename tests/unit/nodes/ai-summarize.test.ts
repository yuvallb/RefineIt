import { describe, expect, it } from 'vitest';

import { aiSummarize } from '@/nodes/ai-summarize';

const upstream = [{ name: 'notes', dtype: 'string' as const, pandasDtype: 'object', nullable: true }];

describe('aiSummarize', () => {
  it('compiles stats dataset panel mode', () => {
    const code = aiSummarize.compile(
      { method: 'stats', scope: 'dataset', output: 'panel' },
      ['node_a'],
      'node_b',
      {},
    );
    expect(code).toContain('node_b = node_a.copy()');
    expect(code).toContain('build_dataset_stats_summary');
    expect(code).toContain('store_node_summary');
  });

  it('compiles stats column dataframe mode', () => {
    const code = aiSummarize.compile(
      { method: 'stats', scope: 'column', column: 'notes', output: 'dataframe', topK: 5 },
      ['node_a'],
      'node_b',
      {},
    );
    expect(code).toContain("build_column_text_summary(node_a, \"notes\"");
    expect(code).toContain("pd.DataFrame({'summary':");
  });

  it('validate rejects llm method', () => {
    const errors = aiSummarize.validate({ method: 'llm', scope: 'dataset' }, [upstream]);
    expect(errors.some((e) => e.message.includes('Not implemented yet'))).toBe(true);
  });

  it('requires column for column scope', () => {
    const errors = aiSummarize.validate(
      { method: 'stats', scope: 'column', column: '' },
      [upstream],
    );
    expect(errors.some((e) => e.message.includes('Select a column'))).toBe(true);
  });

  it('is visible in palette without feature flag', () => {
    expect(aiSummarize.hiddenInPalette).toBeFalsy();
  });
});
