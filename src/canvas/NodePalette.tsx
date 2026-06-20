import {
  ArrowUpDown,
  ChevronDown,
  Columns3,
  Combine,
  Download,
  Eraser,
  FileJson,
  FileSpreadsheet,
  Filter,
  FunctionSquare,
  GitMerge,
  Layers,
  PaintBucket,
  Search,
  TextCursorInput,
  Type,
} from 'lucide-react';
import { useMemo, useState } from 'react';

import { useFileImport } from '@/hooks/useFileImport';
import { getNodeDefinition, getNodesByPaletteGroup } from '@/nodes/registry';
import { ALL_PALETTE_GROUPS, PALETTE_GROUP_LABELS } from '@/nodes/palette-groups';
import type { PaletteGroup } from '@/nodes/types';
import type { NodeType } from '@/lib/types';
import { useUiStore } from '@/state/ui-store';
import { useWorkflowStore } from '@/state/workflow-store';
import { Input } from '@/ui/components/ui/input';

const NODE_ICONS: Partial<Record<NodeType, React.ComponentType<{ className?: string }>>> = {
  'source.csv': FileSpreadsheet,
  'source.json': FileJson,
  filter: Filter,
  select: Columns3,
  rename: TextCursorInput,
  derive: FunctionSquare,
  sort: ArrowUpDown,
  groupby: Layers,
  join: GitMerge,
  concat: Combine,
  dropna: Eraser,
  fillna: PaintBucket,
  cast: Type,
  'output.csv': Download,
  'output.json': Download,
  'output.parquet': Download,
};

function matchesSearch(nodeType: NodeType, label: string, query: string): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;
  return label.toLowerCase().includes(normalized) || nodeType.toLowerCase().includes(normalized);
}

function isGroupCollapsed(
  group: PaletteGroup,
  nodeCount: number,
  paletteCollapseState: Partial<Record<PaletteGroup, boolean>>,
): boolean {
  const stored = paletteCollapseState[group];
  if (stored !== undefined) return stored;
  return nodeCount === 0;
}

export function NodePalette() {
  const grouped = getNodesByPaletteGroup();
  const addNode = useWorkflowStore((s) => s.addNode);
  const paletteCollapseState = useUiStore((s) => s.paletteCollapseState);
  const setPaletteGroupCollapsed = useUiStore((s) => s.setPaletteGroupCollapsed);
  const { requestImport } = useFileImport();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredGroups = useMemo(() => {
    const query = searchQuery.trim();
    const result: Record<PaletteGroup, ReturnType<typeof getNodesByPaletteGroup>[PaletteGroup]> =
      {} as Record<PaletteGroup, ReturnType<typeof getNodesByPaletteGroup>[PaletteGroup]>;

    for (const group of ALL_PALETTE_GROUPS) {
      const nodes = grouped[group].filter((node) => matchesSearch(node.type, node.label, query));
      result[group] = nodes;
    }

    return result;
  }, [grouped, searchQuery]);

  const isFiltering = searchQuery.trim().length > 0;
  const visibleGroups = isFiltering
    ? ALL_PALETTE_GROUPS.filter((group) => filteredGroups[group].length > 0)
    : ALL_PALETTE_GROUPS;

  const onDragStart = (event: React.DragEvent, type: NodeType) => {
    event.dataTransfer.setData('application/transformstudio-node', type);
    event.dataTransfer.effectAllowed = 'move';
  };

  const onAddClick = (type: NodeType) => {
    const state = useWorkflowStore.getState();
    const index = state.workflow.nodes.length;
    const position = { x: 80 + index * 220, y: 180 };

    if (getNodeDefinition(type).category === 'source') {
      requestImport(type as 'source.csv' | 'source.json', { position });
      return;
    }

    addNode(type, position);
  };

  return (
    <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search nodes…"
          aria-label="Search nodes"
          className="h-8 pl-8 text-xs"
        />
      </div>

      <div className="flex flex-col gap-2">
        {visibleGroups.map((group) => {
          const nodes = filteredGroups[group];
          const collapsed = isGroupCollapsed(group, nodes.length, paletteCollapseState);
          const groupLabel = PALETTE_GROUP_LABELS[group];

          return (
            <details
              key={group}
              open={!collapsed}
              className="group rounded-md border border-border/60"
              onToggle={(event) => {
                setPaletteGroupCollapsed(group, !event.currentTarget.open);
              }}
            >
              <summary
                className="flex cursor-pointer list-none items-center gap-2 rounded-md px-2.5 py-2 text-left hover:bg-muted/60 [&::-webkit-details-marker]:hidden"
                aria-label={`${groupLabel} section`}
              >
                <ChevronDown
                  className="size-3.5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
                />
                <span className="flex-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  {groupLabel}
                </span>
                <span
                  className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
                  aria-label={`${nodes.length} nodes`}
                >
                  {nodes.length}
                </span>
              </summary>

              {nodes.length > 0 && (
                <div className="flex flex-col gap-1 px-2 pb-2">
                  {nodes.map((node) => {
                    const Icon = NODE_ICONS[node.type];
                    return (
                      <button
                        key={node.type}
                        type="button"
                        draggable
                        aria-label={`Add ${node.label} node`}
                        onDragStart={(e) => onDragStart(e, node.type)}
                        onClick={() => onAddClick(node.type)}
                        className="flex cursor-grab items-center gap-2 rounded-md border border-border bg-background px-2.5 py-1.5 text-left text-xs hover:bg-muted active:cursor-grabbing"
                      >
                        {Icon && <Icon className="size-3.5 shrink-0 text-muted-foreground" />}
                        {node.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </details>
          );
        })}
      </div>
    </div>
  );
}
