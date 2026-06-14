import type { ColumnProfile, HistogramBin } from '@/lib/types';
import { useRuntimeStore } from '@/state/runtime-store';
import { useUiStore } from '@/state/ui-store';
import { useWorkflowStore } from '@/state/workflow-store';

import { useProfile } from '@/hooks/useProfile';

function formatNumber(value: number): string {
  if (Number.isInteger(value)) return value.toLocaleString();
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function formatPct(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function truncateLabel(value: string, max = 32): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1)}…`;
}

function isNumericProfile(profile: ColumnProfile): boolean {
  return profile.histogram !== undefined || typeof profile.mean === 'number';
}

function HistogramChart({ bins }: { bins: HistogramBin[] }) {
  if (bins.length === 0) {
    return <p className="text-[10px] text-muted-foreground">No data</p>;
  }

  const maxCount = Math.max(...bins.map((b) => b.count), 1);

  return (
    <div className="flex h-10 items-end gap-px" aria-label="Histogram">
      {bins.map((bin, index) => (
        <div
          key={index}
          className="min-w-0 flex-1 rounded-sm bg-primary/70"
          style={{ height: `${Math.max((bin.count / maxCount) * 100, bin.count > 0 ? 8 : 0)}%` }}
          title={`${formatNumber(bin.bin_start)} – ${formatNumber(bin.bin_end)}: ${bin.count}`}
        />
      ))}
    </div>
  );
}

function TopValuesList({ values }: { values: Record<string, number> }) {
  const entries = Object.entries(values).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) {
    return <p className="text-[10px] text-muted-foreground">No data</p>;
  }

  const maxCount = entries[0]?.[1] ?? 1;

  return (
    <ul className="flex flex-col gap-1">
      {entries.map(([value, count]) => (
        <li key={value} className="flex flex-col gap-0.5">
          <div className="flex items-center justify-between gap-2 text-[10px]">
            <span className="truncate font-mono" title={value}>
              {truncateLabel(value)}
            </span>
            <span className="shrink-0 text-muted-foreground">{count.toLocaleString()}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary/60"
              style={{ width: `${(count / maxCount) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

function ColumnCard({
  profile,
  selected,
  onSelect,
}: {
  profile: ColumnProfile;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      data-testid={`profile-column-${profile.name}`}
      className={`w-full rounded-md border p-3 text-left transition-colors ${
        selected
          ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
          : 'border-border bg-background hover:bg-muted/50'
      }`}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold">{profile.name}</p>
          <p className="font-mono text-[10px] text-muted-foreground">{profile.dtype}</p>
        </div>
        <span className="shrink-0 text-[10px] text-muted-foreground">
          {profile.uniqueCount.toLocaleString()} unique
        </span>
      </div>

      <p className="mb-2 text-[10px] text-muted-foreground">
        {profile.nullCount.toLocaleString()} nulls ({formatPct(profile.nullPct)})
      </p>

      {isNumericProfile(profile) && (
        <div className="space-y-2">
          <div className="grid grid-cols-3 gap-1 text-[10px]">
            {profile.min !== undefined && (
              <div>
                <span className="text-muted-foreground">min</span>
                <p className="font-mono">{String(profile.min)}</p>
              </div>
            )}
            {profile.mean !== undefined && (
              <div>
                <span className="text-muted-foreground">mean</span>
                <p className="font-mono">{formatNumber(profile.mean)}</p>
              </div>
            )}
            {profile.max !== undefined && (
              <div>
                <span className="text-muted-foreground">max</span>
                <p className="font-mono">{String(profile.max)}</p>
              </div>
            )}
          </div>
          {profile.histogram && <HistogramChart bins={profile.histogram} />}
        </div>
      )}

      {profile.topValues && <TopValuesList values={profile.topValues} />}

      {!isNumericProfile(profile) &&
        !profile.topValues &&
        profile.min !== undefined &&
        profile.max !== undefined && (
          <div className="grid grid-cols-2 gap-1 text-[10px]">
            <div>
              <span className="text-muted-foreground">min</span>
              <p className="font-mono">{String(profile.min)}</p>
            </div>
            <div>
              <span className="text-muted-foreground">max</span>
              <p className="font-mono">{String(profile.max)}</p>
            </div>
          </div>
        )}
    </button>
  );
}

function ProfileSkeleton() {
  return (
    <div className="flex flex-col gap-3 p-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-24 animate-pulse rounded-md bg-muted" />
      ))}
    </div>
  );
}

export function ProfilePanel() {
  useProfile();

  const selectedNodeId = useWorkflowStore((s) => s.selectedNodeId);
  const staleNodeIds = useWorkflowStore((s) => s.staleNodeIds);
  const isRunning = useRuntimeStore((s) => s.isRunning);
  const runtime = useRuntimeStore((s) =>
    selectedNodeId ? (s.byNodeId.get(selectedNodeId) ?? null) : null,
  );
  const highlightedColumn = useUiStore((s) => s.highlightedColumn);
  const setHighlightedColumn = useUiStore((s) => s.setHighlightedColumn);

  if (!selectedNodeId) {
    return (
      <div className="flex h-full items-center justify-center p-4 text-sm text-muted-foreground">
        Select a node to view its data profile
      </div>
    );
  }

  const isStale = staleNodeIds.has(selectedNodeId);
  const isLoading =
    isRunning || runtime?.status === 'running' || (runtime?.status === 'success' && !runtime.profile);

  if (runtime?.status === 'error') {
    return (
      <div className="flex h-full items-center justify-center p-4 text-sm text-red-600">
        {runtime.error ?? 'Node execution failed'}
      </div>
    );
  }

  if (isLoading) {
    return <ProfileSkeleton />;
  }

  if (!runtime?.profile || runtime.profile.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-4 text-sm text-muted-foreground">
        No profile available — run the pipeline or import data
      </div>
    );
  }

  const rowCount = runtime.preview?.totalRows ?? 0;

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border px-4 py-2">
        <p className="text-xs font-medium">Data Profile</p>
        <p className="text-[10px] text-muted-foreground">
          {runtime.profile.length} columns · {rowCount.toLocaleString()} rows
        </p>
        {isStale && (
          <p className="mt-1 text-[10px] text-amber-600">Profile may be outdated — re-running…</p>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-3">
        {runtime.profile.map((column) => (
          <ColumnCard
            key={column.name}
            profile={column}
            selected={highlightedColumn === column.name}
            onSelect={() =>
              setHighlightedColumn(highlightedColumn === column.name ? null : column.name)
            }
          />
        ))}
      </div>
    </div>
  );
}
