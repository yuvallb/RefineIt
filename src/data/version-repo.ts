import { db } from '@/data/db';
import type { VersionSnapshot } from '@/lib/types';

export async function createVersion(snapshot: VersionSnapshot): Promise<void> {
  await db.versions.put(snapshot);
}

export async function listVersions(workflowId: string): Promise<VersionSnapshot[]> {
  return db.versions.where('workflowId').equals(workflowId).sortBy('createdAt').then((rows) =>
    rows.reverse(),
  );
}

export async function getVersion(id: string): Promise<VersionSnapshot | null> {
  return (await db.versions.get(id)) ?? null;
}

export async function deleteVersionsForWorkflow(workflowId: string): Promise<void> {
  await db.versions.where('workflowId').equals(workflowId).delete();
}

export async function getLatestVersion(workflowId: string): Promise<VersionSnapshot | null> {
  const versions = await listVersions(workflowId);
  return versions[0] ?? null;
}
