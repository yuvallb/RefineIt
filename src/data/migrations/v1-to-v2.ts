import type { Workflow } from '@/lib/types';

/** Stub migration — no structural changes until schema v2 is defined. */
export function migrateV1ToV2(workflow: Workflow): Workflow {
  return { ...workflow, schemaVersion: 2 };
}
