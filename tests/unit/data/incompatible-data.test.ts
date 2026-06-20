import 'fake-indexeddb/auto';

import { beforeEach, describe, expect, it } from 'vitest';

import { clearAllLocalData, db } from '@/data/db';
import {
  IncompatibleWorkflowError,
  saveWorkflow,
  validateAllStoredWorkflows,
} from '@/data/workflow-repo';
import { WORKFLOW_SCHEMA_VERSION } from '@/lib/constants';
import type { Workflow } from '@/lib/types';
import { useWorkflowStore } from '@/state/workflow-store';

function sampleWorkflow(id: string, overrides: Partial<Workflow> = {}): Workflow {
  return {
    id,
    name: `Workflow ${id}`,
    schemaVersion: WORKFLOW_SCHEMA_VERSION,
    nodes: [
      {
        id: 'n1',
        type: 'source.csv',
        position: { x: 0, y: 0 },
        config: { filename: 'data.csv' },
      },
    ],
    edges: [],
    params: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('incompatible local data', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  it('validateAllStoredWorkflows fails when one workflow has unknown node type', async () => {
    await saveWorkflow(sampleWorkflow('valid'));
    await db.workflows.put({
      ...sampleWorkflow('invalid'),
      nodes: [
        {
          id: 'bad',
          type: 'unknown.node' as Workflow['nodes'][number]['type'],
          position: { x: 0, y: 0 },
          config: {},
        },
      ],
    });

    await expect(validateAllStoredWorkflows()).rejects.toThrow(IncompatibleWorkflowError);
  });

  it('validateAllStoredWorkflows fails when one workflow uses old schema version', async () => {
    await saveWorkflow(sampleWorkflow('valid'));
    await db.workflows.put(sampleWorkflow('old', { schemaVersion: 1 }));

    await expect(validateAllStoredWorkflows()).rejects.toThrow(IncompatibleWorkflowError);
  });

  it('clearAllLocalData removes workflows and resets workflow store', async () => {
    await saveWorkflow(sampleWorkflow('wf-1'));
    await saveWorkflow(sampleWorkflow('wf-2', { id: 'wf-2' }));

    await clearAllLocalData();

    const records = await db.workflows.toArray();
    expect(records).toHaveLength(0);
    expect(useWorkflowStore.getState().workflow.nodes).toHaveLength(0);
  });
});
