import { describe, expect, it } from 'vitest';

import { aiClassify } from '@/nodes/ai-classify';

const upstream = [
  { name: 'text', dtype: 'string' as const, pandasDtype: 'object', nullable: true },
  { name: 'label', dtype: 'string' as const, pandasDtype: 'object', nullable: true },
  { name: 'score', dtype: 'float' as const, pandasDtype: 'float64', nullable: true },
];

describe('aiClassify', () => {
  it('compiles rules with default label', () => {
    const code = aiClassify.compile(
      {
        method: 'rules',
        column: 'text',
        defaultLabel: 'other',
        rules: [
          { match: 'contains', pattern: 'good', label: 'pos' },
          { match: 'regex', pattern: 'bad', label: 'neg' },
        ],
      },
      ['node_a'],
      'node_b',
      {},
    );
    expect(code).toContain('apply_classify_rules');
    expect(code).toContain('"other"');
    expect(code).toContain('text_class');
  });

  it('compiles equal-width cut', () => {
    const code = aiClassify.compile(
      { method: 'cut', column: 'score', cutMode: 'equal', binCount: 4, labels: ['a', 'b', 'c', 'd'] },
      ['node_a'],
      'node_b',
      {},
    );
    expect(code).toContain('pd.cut');
    expect(code).toContain('bins=4');
  });

  it('compiles supervised sklearn snippet', () => {
    const code = aiClassify.compile(
      {
        method: 'supervised',
        column: 'text',
        labelColumn: 'label',
        maxTrainRows: 100,
      },
      ['node_a'],
      'node_b',
      {},
    );
    expect(code).toContain('TfidfVectorizer');
    expect(code).toContain('MultinomialNB');
    expect(code).toContain('.head(100)');
  });

  it('compiles cluster sklearn snippet', () => {
    const code = aiClassify.compile(
      { method: 'cluster', column: 'score', clusterColumns: ['score'], nClusters: 3 },
      ['node_a'],
      'node_b',
      {},
    );
    expect(code).toContain('KMeans');
    expect(code).toContain('n_clusters=3');
  });

  it('validate rejects llm method', () => {
    const errors = aiClassify.validate({ method: 'llm', column: 'text' }, [upstream]);
    expect(errors.some((e) => e.message.includes('Not implemented yet'))).toBe(true);
  });

  it('rules require pattern and label', () => {
    const errors = aiClassify.validate(
      {
        method: 'rules',
        column: 'text',
        rules: [{ match: 'contains', pattern: '', label: '' }],
      },
      [upstream],
    );
    expect(errors.some((e) => e.field === 'rules')).toBe(true);
  });

  it('first-match rules preserve order in compiled JSON', () => {
    const rules = [
      { match: 'contains' as const, pattern: 'a', label: 'A' },
      { match: 'contains' as const, pattern: 'b', label: 'B' },
    ];
    const code = aiClassify.compile(
      { method: 'rules', column: 'text', rules },
      ['node_a'],
      'node_b',
      {},
    );
    expect(code).toContain(JSON.stringify(rules));
  });

  it('is visible in palette without feature flag', () => {
    expect(aiClassify.hiddenInPalette).toBeFalsy();
  });
});
