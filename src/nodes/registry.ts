import type { NodeType } from '@/lib/types';

import { aiAnonymize } from './ai-anonymize';
import { aiClassify } from './ai-classify';
import { aiSummarize } from './ai-summarize';
import { cast } from './cast';
import { concat } from './concat';
import { customPython } from './custom-python';
import { dedup } from './dedup';
import { derive } from './derive';
import { drop } from './drop';
import { dropna } from './dropna';
import { dtCalc } from './dt-calc';
import { dtExtract } from './dt-extract';
import { fillna } from './fillna';
import { filter } from './filter';
import { findDuplicates } from './find-duplicates';
import { groupby } from './groupby';
import { impute } from './impute';
import { join } from './join';
import { limit } from './limit';
import { melt } from './melt';
import { mergeColumns } from './merge-columns';
import { mergeUpdate } from './merge-update';
import { outliers } from './outliers';
import { outputCsv } from './output-csv';
import { outputJson } from './output-json';
import { outputParquet } from './output-parquet';
import { ALL_PALETTE_GROUPS } from './palette-groups';
import { pivot } from './pivot';
import { rename } from './rename';
import { reorder } from './reorder';
import { sample } from './sample';
import { select } from './select';
import { sort } from './sort';
import { sourceCsv } from './source-csv';
import { sourceJson } from './source-json';
import { sourceParquet } from './source-parquet';
import { splitColumn } from './split-column';
import { strExtract } from './str-extract';
import { strSplit } from './str-split';
import { strTransform } from './str-transform';
import type { NodeDefinition, PaletteGroup } from './types';
import { validateNode } from './validate-node';
import { windowRank } from './window-rank';
import { windowRolling } from './window-rolling';
import { windowShift } from './window-shift';

export const nodeRegistry: Record<NodeType, NodeDefinition> = {
  'source.csv': sourceCsv,
  'source.json': sourceJson,
  'source.parquet': sourceParquet,
  filter,
  select,
  rename,
  derive,
  sort,
  groupby,
  join,
  concat,
  dropna,
  fillna,
  cast,
  'output.csv': outputCsv,
  'output.json': outputJson,
  'output.parquet': outputParquet,
  sample,
  dedup,
  limit,
  reorder,
  drop,
  'split.column': splitColumn,
  'merge.columns': mergeColumns,
  impute,
  pivot,
  melt,
  'merge.update': mergeUpdate,
  'str.transform': strTransform,
  'str.extract': strExtract,
  'str.split': strSplit,
  'dt.extract': dtExtract,
  'dt.calc': dtCalc,
  validate: validateNode,
  outliers,
  'find.duplicates': findDuplicates,
  'window.rolling': windowRolling,
  'window.rank': windowRank,
  'window.shift': windowShift,
  'ai.classify': aiClassify,
  'ai.summarize': aiSummarize,
  'ai.anonymize': aiAnonymize,
  'custom.python': customPython,
};

export function isKnownNodeType(type: string): type is NodeType {
  return type in nodeRegistry;
}

export function getNodeDefinition(type: NodeType): NodeDefinition {
  return nodeRegistry[type];
}

export const m2NodeTypes = Object.keys(nodeRegistry) as NodeType[];

export function getNodesByCategory(): Record<
  'source' | 'transform' | 'output',
  NodeDefinition[]
> {
  const all = Object.values(nodeRegistry);
  return {
    source: all.filter((n) => n.category === 'source'),
    transform: all.filter((n) => n.category === 'transform'),
    output: all.filter((n) => n.category === 'output'),
  };
}

export function getNodesByPaletteGroup(): Record<PaletteGroup, NodeDefinition[]> {
  const grouped = Object.fromEntries(
    ALL_PALETTE_GROUPS.map((group) => [group, [] as NodeDefinition[]]),
  ) as Record<PaletteGroup, NodeDefinition[]>;

  for (const def of Object.values(nodeRegistry)) {
    if (def.hiddenInPalette) continue;
    grouped[def.paletteGroup].push(def);
  }

  for (const group of ALL_PALETTE_GROUPS) {
    grouped[group].sort((a, b) => {
      const orderA = a.paletteOrder ?? 0;
      const orderB = b.paletteOrder ?? 0;
      if (orderA !== orderB) return orderA - orderB;
      return a.label.localeCompare(b.label);
    });
  }

  return grouped;
}
