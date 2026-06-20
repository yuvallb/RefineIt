import type { NodeType } from '@/lib/types';

import type { NodeDefinition } from './types';

/** Cast post-M4 node type IDs until registry/types are updated. */
export function nodeType(id: string): NodeType {
  return id as NodeType;
}

export type PaletteNodeDefinition = NodeDefinition & {
  paletteGroup: string;
  hiddenInPalette?: boolean;
};
