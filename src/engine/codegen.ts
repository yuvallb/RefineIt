import { getNodeDefinition } from '@/nodes/registry';
import type { NodeDefinition } from '@/nodes/types';

import { buildExportNameMap } from '@/engine/export-names';
import type { Workflow, WorkflowNode } from '@/lib/types';
import { paramsToRecord, sanitizeCommentLine } from '@/lib/utils';

import { getInputVars, topoSort } from './topo-sort';

export type PipelineWorkflow = Pick<Workflow, 'nodes' | 'edges' | 'params'>;

export function getSortedPipelineNodes(workflow: PipelineWorkflow): WorkflowNode[] {
  return topoSort(workflow.nodes, workflow.edges);
}

export function getSetupLines(workflow: PipelineWorkflow): string[] {
  const paramRecord = paramsToRecord(workflow.params);
  const lines = [
    'import pandas as pd',
    'import numpy as np',
    '',
    '# Copy-on-Write is enabled by default in Pyodide pandas >= 3',
  ];

  if (workflow.params.length > 0) {
    lines.push('', `params = ${JSON.stringify(paramRecord, null, 2)}`);
  }

  lines.push('');
  return lines;
}

export function getNodeCommentLines(
  node: WorkflowNode,
  def: NodeDefinition,
  step?: number,
): string[] {
  const titleSuffix = node.title ? `: ${sanitizeCommentLine(node.title)}` : '';
  const commentId = step ?? node.id;
  const lines = [`# ${def.label}${titleSuffix}`, `# Node ID: ${commentId}`, `# Type: ${node.type}`];

  if (def.category === 'source') {
    const summary = sanitizeCommentLine(def.configSummary(node.config));
    lines.push(`# Source file: ${summary} — adjust the file path below as needed`);
  }

  return lines;
}

export function getNodeMarkdown(
  node: WorkflowNode,
  def: NodeDefinition,
  step?: number,
): string {
  const titleSuffix = node.title ? `: ${sanitizeCommentLine(node.title)}` : '';
  const stepLabel = step ?? node.id;
  const lines = [
    `## Step ${stepLabel}: ${def.label}${titleSuffix}`,
    '',
    `Node ID: ${stepLabel}`,
    `Type: \`${node.type}\``,
  ];

  const summary = def.configSummary(node.config);
  if (summary) {
    lines.push('', `Config: ${summary}`);
  }

  if (def.category === 'source') {
    lines.push('', '> Provide the data file at the path shown in the code cell (adjust as needed).');
  }

  return lines.join('\n');
}

function resolveExportVar(nodeId: string, exportNames: ReturnType<typeof buildExportNameMap>): string {
  return exportNames.get(nodeId)?.varName ?? `node_${nodeId}`;
}

function resolveWorkerVar(
  workerVar: string,
  exportNames: ReturnType<typeof buildExportNameMap>,
): string {
  if (workerVar.startsWith('node_')) {
    return resolveExportVar(workerVar.slice(5), exportNames);
  }
  return workerVar;
}

export function compileNodeExportCode(
  node: WorkflowNode,
  workflow: PipelineWorkflow,
  exportNames?: ReturnType<typeof buildExportNameMap>,
): string {
  const def = getNodeDefinition(node.type);
  const paramRecord = paramsToRecord(workflow.params);
  const nameMap = exportNames ?? buildExportNameMap(workflow);
  const inputVars = getInputVars(node.id, workflow.edges, def.inputs).map((workerVar) =>
    resolveWorkerVar(workerVar, nameMap),
  );
  const outputVar = resolveExportVar(node.id, nameMap);
  return def.compile(node.config, inputVars, outputVar, paramRecord, {
    mode: 'export',
    exportNames: nameMap,
  });
}

export function generatePipelineCode(workflow: PipelineWorkflow): string {
  const lines = [...getSetupLines(workflow)];
  const exportNames = buildExportNameMap(workflow);

  for (const node of getSortedPipelineNodes(workflow)) {
    const def = getNodeDefinition(node.type);
    const step = exportNames.get(node.id)?.step;
    lines.push(...getNodeCommentLines(node, def, step));
    lines.push(compileNodeExportCode(node, workflow, exportNames));
    lines.push('');
  }

  return lines.join('\n').trimEnd();
}

export function generateNodeCode(nodeId: string, workflow: PipelineWorkflow): string {
  const node = workflow.nodes.find((n) => n.id === nodeId);
  if (!node) return '';

  const exportNames = buildExportNameMap(workflow);
  return compileNodeExportCode(node, workflow, exportNames);
}
