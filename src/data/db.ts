import Dexie, { type Table } from 'dexie';
import { toast } from 'sonner';

import type { DatasetRecord, VersionSnapshot, WorkflowRecord } from '@/lib/types';
import { useRuntimeStore } from '@/state/runtime-store';
import { useWorkflowStore } from '@/state/workflow-store';

export class TransformStudioDB extends Dexie {
  workflows!: Table<WorkflowRecord, string>;
  datasets!: Table<DatasetRecord, string>;
  versions!: Table<VersionSnapshot, string>;

  constructor() {
    super('TransformStudioDB');
    this.version(1).stores({
      workflows: 'id, updatedAt',
      datasets: 'id, workflowId, nodeId, [workflowId+nodeId]',
      versions: 'id, workflowId, createdAt, parentId',
    });
  }
}

export const db = new TransformStudioDB();

export async function clearAllLocalData(): Promise<void> {
  await db.delete();
  await db.open();
  useWorkflowStore.getState().newWorkflow();
  useRuntimeStore.getState().reset();
  toast.success('All local data cleared');
}
