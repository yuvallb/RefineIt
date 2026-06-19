import { saveDataset } from '@/data/dataset-repo';
import { saveWorkflow } from '@/data/workflow-repo';
import type { Demo, DemoDataset } from '@/lib/demos';
import type { NodeDataset, Workflow, WorkflowNode } from '@/lib/types';
import { deserializeWorkflow } from '@/sharing/serialize';
import { useRuntimeStore } from '@/state/runtime-store';
import { useWorkflowStore } from '@/state/workflow-store';

export function sortSourceNodes(nodes: WorkflowNode[]): WorkflowNode[] {
  return nodes
    .filter((n) => n.type.startsWith('source.'))
    .sort((a, b) => {
      const dy = a.position.y - b.position.y;
      if (dy !== 0) return dy;
      return a.position.x - b.position.x;
    });
}

export async function fetchDemoDatasets(
  workflow: Workflow,
  datasetRefs: DemoDataset[],
): Promise<Record<string, NodeDataset>> {
  const sourceNodes = sortSourceNodes(workflow.nodes);

  if (datasetRefs.length !== sourceNodes.length) {
    throw new Error(
      `Demo bundle has ${datasetRefs.length} dataset(s) but workflow has ${sourceNodes.length} source node(s)`,
    );
  }

  const fetched = await Promise.all(
    datasetRefs.map(async (ref) => {
      const response = await fetch(ref.file);
      if (!response.ok) {
        throw new Error(`Failed to load ${ref.filename} (${response.status})`);
      }
      const buffer = await response.arrayBuffer();
      return { filename: ref.filename, data: new Uint8Array(buffer) };
    }),
  );

  const datasets: Record<string, NodeDataset> = {};
  for (let i = 0; i < sourceNodes.length; i++) {
    const node = sourceNodes[i]!;
    const { filename, data } = fetched[i]!;
    datasets[node.id] = { nodeId: node.id, filename, data };
  }

  return datasets;
}

async function persistDemoDatasets(datasets: Record<string, NodeDataset>): Promise<void> {
  const { workflow } = useWorkflowStore.getState();
  await Promise.all(
    Object.entries(datasets).map(([nodeId, dataset]) => {
      const node = workflow.nodes.find((n) => n.id === nodeId);
      const mimeType = node?.type === 'source.json' ? 'application/json' : 'text/csv';
      return saveDataset(workflow.id, nodeId, dataset, mimeType);
    }),
  );
}

export async function loadDemoWorkflow(demo: Demo): Promise<Workflow> {
  const response = await fetch(demo.workflow);
  if (!response.ok) {
    throw new Error(`Failed to load demo (${response.status})`);
  }

  const workflow = deserializeWorkflow(await response.text());

  useRuntimeStore.getState().reset();
  useWorkflowStore.getState().loadWorkflowState(workflow, {});

  if (demo.datasets.length > 0) {
    const datasets = await fetchDemoDatasets(workflow, demo.datasets);
    const { setDataset } = useWorkflowStore.getState();
    for (const dataset of Object.values(datasets)) {
      setDataset(dataset.nodeId, dataset);
    }
    await persistDemoDatasets(datasets);
  }

  useWorkflowStore.getState().markAllStale();
  await saveWorkflow(useWorkflowStore.getState().workflow);

  return useWorkflowStore.getState().workflow;
}
