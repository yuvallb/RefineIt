import type { PreviewPayload } from '@/lib/types';
import { useRuntimeStore } from '@/state/runtime-store';
import { useWorkflowStore } from '@/state/workflow-store';

export function useSelectedPreview(): PreviewPayload | null {
  const selectedNodeId = useWorkflowStore((s) => s.selectedNodeId);
  return useRuntimeStore((s) =>
    selectedNodeId ? (s.byNodeId.get(selectedNodeId)?.preview ?? null) : null,
  );
}
