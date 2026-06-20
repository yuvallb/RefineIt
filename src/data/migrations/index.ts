import { WORKFLOW_SCHEMA_VERSION } from '@/lib/constants';
import type { Workflow } from '@/lib/types';

import { IncompatibleWorkflowError } from '../workflow-repo';

export function migrateWorkflow(workflow: Workflow): Workflow {
  if (workflow.schemaVersion < WORKFLOW_SCHEMA_VERSION) {
    throw new IncompatibleWorkflowError(
      `Cannot migrate workflow from schema version ${workflow.schemaVersion} to ${WORKFLOW_SCHEMA_VERSION}. Clear local data to continue.`,
    );
  }

  if (workflow.schemaVersion > WORKFLOW_SCHEMA_VERSION) {
    throw new IncompatibleWorkflowError(
      `Workflow uses unsupported schema version ${workflow.schemaVersion}. Please update RefineIt.`,
    );
  }

  return workflow;
}
