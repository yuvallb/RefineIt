import { describe, expect, it } from 'vitest';

import { getInputVars } from '@/engine/topo-sort';
import type { WorkflowEdge } from '@/lib/types';

describe('multi-input port ordering', () => {
  const edges: WorkflowEdge[] = [
    { id: 'e1', source: 'left_src', target: 'join1', targetHandle: 'left' },
    { id: 'e2', source: 'right_src', target: 'join1', targetHandle: 'right' },
  ];

  it('orders input vars by port id', () => {
    const vars = getInputVars('join1', edges, [
      { id: 'left', label: 'Left' },
      { id: 'right', label: 'Right' },
    ]);
    expect(vars).toEqual(['node_left_src', 'node_right_src']);
  });
});
