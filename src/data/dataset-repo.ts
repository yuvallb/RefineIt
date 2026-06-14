import { db } from '@/data/db';
import type { DatasetRecord, NodeDataset } from '@/lib/types';
import { createId } from '@/lib/utils';

export async function saveDataset(
  workflowId: string,
  nodeId: string,
  dataset: NodeDataset,
  mimeType = 'application/octet-stream',
): Promise<DatasetRecord> {
  const existing = await db.datasets
    .where('[workflowId+nodeId]')
    .equals([workflowId, nodeId])
    .first();

  const record: DatasetRecord = {
    id: existing?.id ?? createId(),
    workflowId,
    nodeId,
    filename: dataset.filename,
    mimeType,
    data: dataset.data.buffer.slice(
      dataset.data.byteOffset,
      dataset.data.byteOffset + dataset.data.byteLength,
    ) as ArrayBuffer,
    importedAt: existing?.importedAt ?? new Date().toISOString(),
  };

  await db.datasets.put(record);
  return record;
}

export async function loadDatasetsForWorkflow(workflowId: string): Promise<DatasetRecord[]> {
  return db.datasets.where('workflowId').equals(workflowId).toArray();
}

export async function deleteDatasetForNode(workflowId: string, nodeId: string): Promise<void> {
  const record = await db.datasets
    .where('[workflowId+nodeId]')
    .equals([workflowId, nodeId])
    .first();
  if (record) {
    await db.datasets.delete(record.id);
  }
}

export async function deleteDatasetsForWorkflow(workflowId: string): Promise<void> {
  await db.datasets.where('workflowId').equals(workflowId).delete();
}

export function datasetRecordToNodeDataset(record: DatasetRecord): NodeDataset {
  return {
    nodeId: record.nodeId,
    filename: record.filename,
    data: new Uint8Array(record.data),
  };
}

export async function copyDatasetsToWorkflow(
  sourceWorkflowId: string,
  targetWorkflowId: string,
  nodeIdMap: Map<string, string>,
): Promise<Record<string, NodeDataset>> {
  const sourceRecords = await loadDatasetsForWorkflow(sourceWorkflowId);
  const datasets: Record<string, NodeDataset> = {};

  for (const record of sourceRecords) {
    const newNodeId = nodeIdMap.get(record.nodeId);
    if (!newNodeId) continue;

    const nodeDataset = datasetRecordToNodeDataset(record);
    datasets[newNodeId] = nodeDataset;
    await saveDataset(targetWorkflowId, newNodeId, nodeDataset, record.mimeType);
  }

  return datasets;
}
