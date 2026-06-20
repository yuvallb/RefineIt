import type { PaletteGroup } from './types';

export const PALETTE_GROUP_LABELS: Record<PaletteGroup, string> = {
  io: 'Input / Output',
  row: 'Row Operations',
  column: 'Column Operations',
  missing: 'Missing Data',
  aggregate: 'Aggregations',
  combine: 'Combine Operations',
  text: 'Text Transformations',
  datetime: 'Date / Time',
  quality: 'Data Quality',
  window: 'Window Operations',
  ai: 'AI',
  python: 'Python Code',
};

export const ALL_PALETTE_GROUPS: PaletteGroup[] = [
  'io',
  'row',
  'column',
  'missing',
  'aggregate',
  'combine',
  'text',
  'datetime',
  'quality',
  'window',
  'ai',
  'python',
];
