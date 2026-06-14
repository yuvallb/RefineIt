import type { WorkflowEdge, WorkflowNode, ColumnSchema, NodeRuntimeState } from '@/lib/types';
import type { NodeInputPort } from '@/nodes/types';

export class CycleError extends Error {
  constructor() {
    super('Pipeline contains a cycle');
    this.name = 'CycleError';
  }
}

export function getUpstreamNodeIds(nodeId: string, edges: WorkflowEdge[]): string[] {
  return edges.filter((e) => e.target === nodeId).map((e) => e.source);
}

export function getDownstreamNodeIds(nodeId: string, edges: WorkflowEdge[]): string[] {
  const downstream = new Set<string>();
  const queue = [nodeId];

  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const edge of edges) {
      if (edge.source === current && !downstream.has(edge.target)) {
        downstream.add(edge.target);
        queue.push(edge.target);
      }
    }
  }

  return [...downstream];
}

export function getInputVars(
  nodeId: string,
  edges: WorkflowEdge[],
  inputPorts?: NodeInputPort[],
): string[] {
  const incoming = edges.filter((e) => e.target === nodeId);

  if (!inputPorts || inputPorts.length <= 1) {
    return incoming.map((e) => `node_${e.source}`);
  }

  const varByHandle = new Map<string, string>();
  for (const edge of incoming) {
    const handle = edge.targetHandle ?? inputPorts[0]?.id;
    if (handle) {
      varByHandle.set(handle, `node_${edge.source}`);
    }
  }

  return inputPorts
    .map((port) => varByHandle.get(port.id))
    .filter((v): v is string => typeof v === 'string');
}

export function getUpstreamSchemas(
  nodeId: string,
  edges: WorkflowEdge[],
  runtimeByNode: Map<string, NodeRuntimeState>,
  inputPorts?: NodeInputPort[],
): ColumnSchema[][] {
  const incoming = edges.filter((e) => e.target === nodeId);

  if (!inputPorts || inputPorts.length <= 1) {
    return incoming.map((e) => runtimeByNode.get(e.source)?.preview?.columns ?? []);
  }

  const schemaByHandle = new Map<string, ColumnSchema[]>();
  for (const edge of incoming) {
    const handle = edge.targetHandle ?? inputPorts[0]?.id;
    if (handle) {
      schemaByHandle.set(handle, runtimeByNode.get(edge.source)?.preview?.columns ?? []);
    }
  }

  return inputPorts.map((port) => schemaByHandle.get(port.id) ?? []);
}

export function topoSort(nodes: WorkflowNode[], edges: WorkflowEdge[]): WorkflowNode[] {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const inDegree = new Map<string, number>();
  const adjacency = new Map<string, string[]>();

  for (const node of nodes) {
    inDegree.set(node.id, 0);
    adjacency.set(node.id, []);
  }

  for (const edge of edges) {
    if (!nodeMap.has(edge.source) || !nodeMap.has(edge.target)) {
      continue;
    }
    adjacency.get(edge.source)!.push(edge.target);
    inDegree.set(edge.target, (inDegree.get(edge.target) ?? 0) + 1);
  }

  const queue = nodes.filter((n) => (inDegree.get(n.id) ?? 0) === 0).map((n) => n.id);
  const sorted: WorkflowNode[] = [];

  while (queue.length > 0) {
    const id = queue.shift()!;
    const node = nodeMap.get(id);
    if (node) sorted.push(node);

    for (const next of adjacency.get(id) ?? []) {
      const degree = (inDegree.get(next) ?? 1) - 1;
      inDegree.set(next, degree);
      if (degree === 0) queue.push(next);
    }
  }

  if (sorted.length !== nodes.length) {
    throw new CycleError();
  }

  return sorted;
}
