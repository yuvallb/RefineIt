import { getLatestVersion, createVersion, getVersion } from '@/data/version-repo';
import { saveWorkflow } from '@/data/workflow-repo';
import { WORKFLOW_SCHEMA_VERSION } from '@/lib/constants';
import type { VersionSnapshot, Workflow } from '@/lib/types';
import { createId } from '@/lib/utils';

function cloneWorkflow(workflow: Workflow): Workflow {
  return structuredClone(workflow);
}

export async function createSnapshot(
  workflow: Workflow,
  message: string,
  parentId: string | null = null,
): Promise<VersionSnapshot> {
  const resolvedParent = parentId ?? (await getLatestVersion(workflow.id))?.id ?? null;

  const snapshot: VersionSnapshot = {
    id: createId(),
    workflowId: workflow.id,
    parentId: resolvedParent,
    message,
    workflow: cloneWorkflow(workflow),
    createdAt: new Date().toISOString(),
  };

  await createVersion(snapshot);
  return snapshot;
}

export async function revertToSnapshot(
  snapshotId: string,
  currentWorkflow: Workflow,
): Promise<Workflow> {
  const snapshot = await getVersion(snapshotId);
  if (!snapshot) {
    throw new Error('Version snapshot not found');
  }

  await createSnapshot(currentWorkflow, 'Auto-save before revert');

  const restored = cloneWorkflow(snapshot.workflow);
  restored.updatedAt = new Date().toISOString();
  await saveWorkflow(restored);

  return restored;
}

export async function forkFromSnapshot(snapshotId: string): Promise<Workflow> {
  const snapshot = await getVersion(snapshotId);
  if (!snapshot) {
    throw new Error('Version snapshot not found');
  }

  const now = new Date().toISOString();
  const forked: Workflow = {
    ...cloneWorkflow(snapshot.workflow),
    id: createId(),
    name: `${snapshot.workflow.name} (fork)`,
    schemaVersion: WORKFLOW_SCHEMA_VERSION,
    createdAt: now,
    updatedAt: now,
  };

  await saveWorkflow(forked);
  await createSnapshot(forked, `Forked from "${snapshot.message}"`, null);

  return forked;
}
