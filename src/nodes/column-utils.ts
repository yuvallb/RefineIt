import type { ColumnSchema } from '@/lib/types';

import type { ValidationError } from './types';

export function parseStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string' && item.length > 0);
}

export function parseStringRecord(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const record: Record<string, string> = {};
  for (const [key, val] of Object.entries(value)) {
    if (typeof val === 'string' && val.length > 0) {
      record[key] = val;
    }
  }
  return record;
}

export function validateColumnsExist(
  columns: string[],
  upstream: ColumnSchema[],
  field: string,
): ValidationError[] {
  if (upstream.length === 0) return [];
  const colNames = new Set(upstream.map((c) => c.name));
  return columns
    .filter((col) => !colNames.has(col))
    .map((col) => ({ field, message: `Column "${col}" not found upstream` }));
}
