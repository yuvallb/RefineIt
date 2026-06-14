import { getNodeDefinition } from '@/nodes/registry';

import type { Workflow, WorkflowEdge } from '@/lib/types';
import { paramsToRecord } from '@/lib/utils';

import { getInputVars, topoSort } from './topo-sort';

export function generatePipelineCode(workflow: Pick<Workflow, 'nodes' | 'edges' | 'params'>): string {
  const sorted = topoSort(workflow.nodes, workflow.edges);
  const paramRecord = paramsToRecord(workflow.params);
  const lines = [
    'import pandas as pd',
    'import numpy as np',
    '',
    'pd.options.mode.copy_on_write = True',
    '',
    `params = ${JSON.stringify(paramRecord, null, 2)}`,
    '',
  ];

  for (const node of sorted) {
    const def = getNodeDefinition(node.type);
    const inputVars = getInputVars(node.id, workflow.edges, def.inputs);
    const outputVar = `node_${node.id}`;
    lines.push(`# ${def.label}${node.title ? `: ${node.title}` : ''}`);
    lines.push(def.compile(node.config, inputVars, outputVar, paramRecord, { mode: 'export' }));
    lines.push('');
  }

  return lines.join('\n');
}

export function generateNodeCode(
  nodeId: string,
  workflow: Pick<Workflow, 'nodes' | 'edges' | 'params'>,
): string {
  const node = workflow.nodes.find((n) => n.id === nodeId);
  if (!node) return '';

  const def = getNodeDefinition(node.type);
  const paramRecord = paramsToRecord(workflow.params);
  const inputVars = getInputVars(nodeId, workflow.edges, def.inputs);
  const outputVar = `node_${node.id}`;

  return def.compile(node.config, inputVars, outputVar, paramRecord, { mode: 'export' });
}

export function validateConnection(
  sourceType: string,
  targetType: string,
  edges: WorkflowEdge[],
  targetId: string,
  targetHandle?: string | null,
): string | null {
  const def = getNodeDefinition(targetType as Workflow['nodes'][0]['type']);
  const incoming = edges.filter((e) => e.target === targetId);

  if (def.category === 'source') {
    return 'Source nodes cannot have inputs';
  }

  if (incoming.length >= def.inputs.length) {
    return `${def.label} already has the maximum number of inputs`;
  }

  const usedHandles = new Set(
    incoming.map((e) => e.targetHandle ?? def.inputs[0]?.id).filter(Boolean),
  );

  if (def.inputs.length > 1) {
    const handle = targetHandle ?? def.inputs.find((p) => !usedHandles.has(p.id))?.id;
    if (!handle) {
      return `${def.label} has no available input ports`;
    }
    if (usedHandles.has(handle)) {
      return `Input port "${handle}" is already connected`;
    }
  }

  const sourceDef = getNodeDefinition(sourceType as Workflow['nodes'][0]['type']);
  if (sourceDef.category === 'output') {
    return 'Output nodes cannot be connected as sources';
  }

  return null;
}
