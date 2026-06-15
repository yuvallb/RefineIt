import { useEffect, useRef } from 'react';

import { kernelClient } from '@/engine/kernel-client';
import { PROFILE_FETCH_DEBOUNCE_MS } from '@/lib/constants';
import { useRuntimeStore } from '@/state/runtime-store';
import { useUiStore } from '@/state/ui-store';
import { useWorkflowStore } from '@/state/workflow-store';

export function useProfile() {
  const selectedNodeId = useWorkflowStore((s) => s.selectedNodeId);
  const staleNodeIds = useWorkflowStore((s) => s.staleNodeIds);
  const setHighlightedColumn = useUiStore((s) => s.setHighlightedColumn);
  const runtime = useRuntimeStore((s) =>
    selectedNodeId ? (s.byNodeId.get(selectedNodeId) ?? null) : null,
  );
  const setNodeState = useRuntimeStore((s) => s.setNodeState);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setHighlightedColumn(null);
  }, [selectedNodeId, setHighlightedColumn]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!selectedNodeId || !runtime) return;
    if (runtime.status !== 'success') return;
    if (runtime.profile !== null) return;
    if (staleNodeIds.has(selectedNodeId)) return;

    const nodeId = selectedNodeId;

    debounceRef.current = setTimeout(() => {
      void (async () => {
        const result = await kernelClient.profileNode(nodeId);
        if (!result.profile) return;

        const current = useRuntimeStore.getState().byNodeId.get(nodeId);
        if (!current || current.status !== 'success' || current.profile !== null) return;

        setNodeState(nodeId, { ...current, profile: result.profile });
      })();
    }, PROFILE_FETCH_DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [selectedNodeId, runtime, staleNodeIds, setNodeState]);
}
