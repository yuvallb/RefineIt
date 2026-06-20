import { db } from '@/data/db';
import { isKnownNodeType, nodeRegistry } from '@/nodes/registry';
import { WORKFLOW_SCHEMA_VERSION } from '@/lib/constants';
import type { Workflow, WorkflowRecord } from '@/lib/types';

export class IncompatibleWorkflowError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'IncompatibleWorkflowError';
  }
}

export function validateWorkflow(workflow: Workflow): void {
  if (workflow.schemaVersion < WORKFLOW_SCHEMA_VERSION) {
    throw new IncompatibleWorkflowError(
      `Workflow "${workflow.name}" uses schema version ${workflow.schemaVersion}, but this app requires version ${WORKFLOW_SCHEMA_VERSION}. Clear local data to continue.`,
    );
  }

  if (workflow.schemaVersion > WORKFLOW_SCHEMA_VERSION) {
    throw new IncompatibleWorkflowError(
      `Workflow "${workflow.name}" uses unsupported schema version ${workflow.schemaVersion}. Please update RefineIt.`,
    );
  }

  for (const node of workflow.nodes) {
    if (!isKnownNodeType(node.type)) {
      throw new IncompatibleWorkflowError(
        `Workflow "${workflow.name}" contains unknown node type "${node.type}". Clear local data to continue.`,
      );
    }
  }
}

export async function validateAllStoredWorkflows(): Promise<void> {
  const records = await db.workflows.toArray();
  for (const record of records) {
    validateWorkflow(record);
  }
}

export async function saveWorkflow(workflow: Workflow): Promise<void> {
  validateWorkflow(workflow);

  const record: WorkflowRecord = {
    ...workflow,
    updatedAt: new Date().toISOString(),
  };
  await db.workflows.put(record);
}

export async function loadWorkflow(id: string): Promise<Workflow | null> {
  const record = await db.workflows.get(id);
  if (!record) return null;
  validateWorkflow(record);
  return record;
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
  validateWorkflow(latest);
  return latest;
}

export function getRegisteredNodeTypes(): string[] {
  return Object.keys(nodeRegistry);
}
