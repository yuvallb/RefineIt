import 'fake-indexeddb/auto';

import { beforeEach, describe, expect, it } from 'vitest';

import { db } from '@/data/db';
import { saveWorkflow } from '@/data/workflow-repo';
import { createSnapshot, forkFromSnapshot, revertToSnapshot } from '@/versioning/snapshot';
import type { Workflow } from '@/lib/types';

const baseWorkflow = (): Workflow => ({
  id: 'wf-1',
  name: 'Pipeline',
  schemaVersion: 2,
  nodes: [
    {
      id: 'n1',
      type: 'filter',
      position: { x: 10, y: 20 },
      config: { expression: 'x > 1' },
    },
  ],
  edges: [],
  params: [],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
});

describe('snapshot', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
    await saveWorkflow(baseWorkflow());
  });

  it('creates a version snapshot', async () => {
    const snapshot = await createSnapshot(baseWorkflow(), 'v1');
    expect(snapshot.message).toBe('v1');
    expect(snapshot.workflow.nodes).toHaveLength(1);
    expect(snapshot.workflow).not.toBe(baseWorkflow());
  });

  it('reverts to a snapshot and auto-saves current state', async () => {
    const snapshot = await createSnapshot(baseWorkflow(), 'v1');

    const edited: Workflow = {
      ...baseWorkflow(),
      nodes: [
        {
          id: 'n2',
          type: 'groupby',
          position: { x: 0, y: 0 },
          config: { groupColumns: ['a'], aggregations: [] },
        },
      ],
      updatedAt: '2026-02-01T00:00:00.000Z',
    };

    const restored = await revertToSnapshot(snapshot.id, edited);
    expect(restored.nodes[0]?.id).toBe('n1');
    expect(restored.nodes[0]?.type).toBe('filter');
  });

  it('forks a snapshot into a new workflow', async () => {
    const snapshot = await createSnapshot(baseWorkflow(), 'v1');
    const forked = await forkFromSnapshot(snapshot.id);

    expect(forked.id).not.toBe('wf-1');
    expect(forked.name).toContain('fork');
    expect(forked.nodes[0]?.id).toBe('n1');
  });
});
