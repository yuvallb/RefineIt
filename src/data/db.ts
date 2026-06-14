import Dexie, { type Table } from 'dexie';

import type { DatasetRecord, VersionSnapshot, WorkflowRecord } from '@/lib/types';

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
