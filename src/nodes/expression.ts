const BLOCKED_PATTERNS = [
  /\bimport\b/i,
  /\bexec\b/i,
  /\beval\s*\(/i,
  /__/,
  /\bopen\s*\(/i,
  /\bgetattr\b/i,
  /\bsetattr\b/i,
  /\bglobals\b/i,
  /\blocals\b/i,
  /\bos\./i,
  /\bsys\./i,
];

const WHITELISTED_CALLS = new Set(['abs', 'round', 'min', 'max']);

export function translateExpression(expression: string): string {
  return expression.replace(/\{(\w+)\}/g, "params['$1']");
}

export function hasParamRefs(expression: string): boolean {
  return /\{(\w+)\}/.test(expression);
}

function columnRefForEval(columnName: string): string {
  if (/^[a-zA-Z_]\w*$/.test(columnName)) {
    return columnName;
  }
  return `\`${columnName.replace(/`/g, '\\`')}\``;
}

function replaceDfBracketColumns(expression: string): string {
  return expression.replace(
    /\bdf\s*\[\s*(["'])((?:\\.|(?!\1).)*)\1\s*\]/g,
    (_match, _quote, columnName: string) => columnRefForEval(columnName),
  );
}

/** Normalize user `df[...]` syntax for pandas DataFrame.eval (bare column names). */
export function normalizeExpressionForEval(expression: string): string {
  let normalized = translateExpression(expression.trim());
  normalized = replaceDfBracketColumns(normalized);
  normalized = normalized.replace(/\bdf\.([a-zA-Z_]\w*)/g, (_match, columnName: string) =>
    columnRefForEval(columnName),
  );
  return normalized;
}

/** Normalize user `df` references for direct boolean indexing / assign (Python, not eval). */
export function normalizeExpressionForMask(expression: string, inputVar: string): string {
  return translateExpression(expression.trim()).replace(/\bdf\b/g, inputVar);
}

export function isExpressionSafe(expression: string): boolean {
  if (/[;\r\n]/.test(expression)) {
    return false;
  }

  if (BLOCKED_PATTERNS.some((pattern) => pattern.test(expression))) {
    return false;
  }

  const callPattern = /\b([a-zA-Z_]\w*)\s*\(/g;
  let match: RegExpExecArray | null;
  while ((match = callPattern.exec(expression)) !== null) {
    if (!WHITELISTED_CALLS.has(match[1]!)) {
      return false;
    }
  }

  return true;
}

export function extractBracketColumns(expression: string): string[] {
  const matches = expression.match(/\[["']([^"']+)["']\]/g);
  if (!matches) return [];
  return matches.map((m) => m.slice(2, -2));
}

const EXPRESSION_KEYWORDS = new Set([
  'and',
  'or',
  'not',
  'True',
  'False',
  'None',
  'in',
  'is',
  'df',
  'params',
]);

export function extractBareColumnNames(expression: string): string[] {
  const withoutBrackets = expression.replace(/\[[^\]]+\]/g, ' ');
  const withoutStrings = withoutBrackets.replace(/["'][^"']*["']/g, ' ');
  const withoutParams = withoutStrings.replace(/\{(\w+)\}/g, ' ');

  const names = new Set<string>();
  const pattern = /\b([a-zA-Z_]\w*)\b/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(withoutParams)) !== null) {
    const name = match[1]!;
    if (EXPRESSION_KEYWORDS.has(name)) continue;
    if (WHITELISTED_CALLS.has(name)) continue;
    if (/^node_/.test(name)) continue;
    names.add(name);
  }

  return [...names];
}

export function validateExpressionColumns(
  expression: string,
  upstreamColumnNames: Iterable<string>,
): string[] {
  const colNames = new Set(upstreamColumnNames);
  const errors: string[] = [];

  for (const col of extractBracketColumns(expression)) {
    if (!colNames.has(col)) {
      errors.push(`Column "${col}" not found upstream`);
    }
  }

  for (const col of extractBareColumnNames(expression)) {
    if (!colNames.has(col)) {
      errors.push(`Column "${col}" not found upstream`);
    }
  }

  return errors;
}
