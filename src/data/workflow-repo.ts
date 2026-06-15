import { db } from '@/data/db';
import { migrateWorkflow } from '@/data/migrations';
import type { Workflow, WorkflowRecord } from '@/lib/types';

export async function saveWorkflow(workflow: Workflow): Promise<void> {
  const record: WorkflowRecord = {
    ...workflow,
    updatedAt: new Date().toISOString(),
  };
  await db.workflows.put(record);
}

export async function loadWorkflow(id: string): Promise<Workflow | null> {
  const record = await db.workflows.get(id);
  if (!record) return null;
  return migrateWorkflow(record);
}

export async function listWorkflows(): Promise<WorkflowRecord[]> {
  return db.workflows.orderBy('updatedAt').reverse().toArray();
}

export async function deleteWorkflow(id: string): Promise<void> {
  await db.workflows.delete(id);
}

export async function getMostRecentWorkflow(): Promise<Workflow | null> {
  const records = await listWorkflows();
  const latest = records[0];
  if (!latest) return null;
  return migrateWorkflow(latest);
}
