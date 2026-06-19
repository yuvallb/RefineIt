import { describe, expect, it } from 'vitest';

import {
  normalizeExpressionForEval,
  normalizeExpressionForMask,
} from '@/nodes/expression';

describe('normalizeExpressionForEval', () => {
  it('converts df bracket notation to bare column names for eval', () => {
    expect(normalizeExpressionForEval('df["revenue"] > 1000')).toBe('revenue > 1000');
    expect(normalizeExpressionForEval("df['revenue'] > 1000")).toBe('revenue > 1000');
  });

  it('converts df attribute access to bare column names', () => {
    expect(normalizeExpressionForEval('df.revenue > 1000')).toBe('revenue > 1000');
  });

  it('backtick-quotes non-identifier column names', () => {
    expect(normalizeExpressionForEval('df["col name"] > 1')).toBe('`col name` > 1');
  });

  it('leaves bare column names unchanged', () => {
    expect(normalizeExpressionForEval('revenue > 1000 and region == "North"')).toBe(
      'revenue > 1000 and region == "North"',
    );
  });
});

describe('normalizeExpressionForMask', () => {
  it('replaces df with the upstream variable for boolean indexing', () => {
    expect(normalizeExpressionForMask('df["country"] == {country}', 'node_a')).toBe(
      "node_a[\"country\"] == params['country']",
    );
  });
});
