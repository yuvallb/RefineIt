import { WORKFLOW_SCHEMA_VERSION } from '@/lib/constants';
import type { Workflow } from '@/lib/types';

const MIGRATIONS: Record<number, (workflow: Workflow) => Workflow> = {
  // 1: migrateV1ToV2 — enable when WORKFLOW_SCHEMA_VERSION becomes 2
};

export function migrateWorkflow(workflow: Workflow): Workflow {
  let current = { ...workflow };

  while (current.schemaVersion < WORKFLOW_SCHEMA_VERSION) {
    const migrate = MIGRATIONS[current.schemaVersion];
    if (!migrate) {
      break;
    }
    current = migrate(current);
  }

  return current;
}
