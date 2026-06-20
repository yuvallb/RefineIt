import { describe, expect, it } from 'vitest';

import { nodeRegistry } from '@/nodes/registry';
import { ALL_PALETTE_GROUPS } from '@/nodes/palette-groups';
import type { PaletteGroup } from '@/nodes/types';
import { getDefaultExportSlug } from '@/engine/export-names';
import type { NodeType } from '@/lib/types';

describe('nodeRegistry', () => {
  it('every registered node has a valid paletteGroup', () => {
    const validGroups = new Set<string>(ALL_PALETTE_GROUPS);
    for (const def of Object.values(nodeRegistry)) {
      expect(validGroups.has(def.paletteGroup)).toBe(true);
    }
  });

  it('has no duplicate type IDs', () => {
    const types = Object.keys(nodeRegistry);
    expect(new Set(types).size).toBe(types.length);
  });

  it('every registered node has an export slug', () => {
    for (const type of Object.keys(nodeRegistry) as NodeType[]) {
      const def = nodeRegistry[type];
      const slug = def.exportVarSlug ?? getDefaultExportSlug(type);
      expect(slug.length).toBeGreaterThan(0);
    }
  });

  it('covers all palette groups in ALL_PALETTE_GROUPS', () => {
    const groupsWithNodes = new Set<PaletteGroup>();
    for (const def of Object.values(nodeRegistry)) {
      if (!def.hiddenInPalette) {
        groupsWithNodes.add(def.paletteGroup);
      }
    }
    expect(ALL_PALETTE_GROUPS.length).toBe(12);
    expect(groupsWithNodes.size).toBeGreaterThan(0);
  });
});
