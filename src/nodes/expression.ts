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

export function translateExpression(expression: string): string {
  return expression.replace(/\{(\w+)\}/g, "params['$1']");
}

export function normalizeExpression(expression: string, inputVar: string): string {
  return translateExpression(expression.trim()).replace(/\bdf\b/g, inputVar);
}

export function isExpressionSafe(expression: string): boolean {
  return !BLOCKED_PATTERNS.some((pattern) => pattern.test(expression));
}

export function extractBracketColumns(expression: string): string[] {
  const matches = expression.match(/\[["']([^"']+)["']\]/g);
  if (!matches) return [];
  return matches.map((m) => m.slice(2, -2));
}
