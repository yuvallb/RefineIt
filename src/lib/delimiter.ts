const CANDIDATE_DELIMITERS = ['\t', ',', ';', '|'] as const;

export function detectDelimiter(text: string): string {
  const firstLine = text.split(/\r?\n/).find((line) => line.trim().length > 0) ?? '';
  if (!firstLine) return ',';

  let best = ',';
  let bestCount = 0;

  for (const delimiter of CANDIDATE_DELIMITERS) {
    const count = firstLine.split(delimiter).length;
    if (count > bestCount) {
      bestCount = count;
      best = delimiter;
    }
  }

  return best;
}
