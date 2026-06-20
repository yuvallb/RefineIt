import { describe, expect, it } from 'vitest';

import {
  buildExportNameMap,
  getDefaultExportSlug,
  sanitizeSlug,
} from '@/engine/export-names';
import { generatePipelineCode } from '@/engine/codegen';
import { nodeRegistry } from '@/nodes/registry';
import type { Workflow } from '@/lib/types';

const joinWorkflow: Workflow = {
  id: 'wf-join',
  name: 'Join test',
  schemaVersion: 2,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  params: [],
  nodes: [
    {
      id: 'csv-src',
      type: 'source.csv',
      position: { x: 0, y: 0 },
      config: { filename: 'sales.csv', delimiter: ',', header: true, encoding: 'utf-8' },
    },
    {
      id: 'json-src',
      type: 'source.json',
      position: { x: 0, y: 0 },
      config: { filename: 'customers.json', orient: 'records' },
    },
    {
      id: 'join-node',
      type: 'join',
      position: { x: 0, y: 0 },
      config: {
        leftOn: 'country',
        rightOn: 'country',
        how: 'inner',
        suffixes: ['_sales', '_cust'],
      },
    },
  ],
  edges: [
    { id: 'e1', source: 'csv-src', target: 'join-node', targetHandle: 'left' },
    { id: 'e2', source: 'json-src', target: 'join-node', targetHandle: 'right' },
  ],
};

describe('sanitizeSlug', () => {
  it('normalizes titles to snake_case identifiers', () => {
    expect(sanitizeSlug('My Sales Data')).toBe('my_sales_data');
    expect(sanitizeSlug('  Revenue 2024!! ')).toBe('revenue_2024');
  });

  it('escapes Python keywords', () => {
    expect(sanitizeSlug('class')).toBe('class_df');
    expect(sanitizeSlug('return')).toBe('return_df');
  });

  it('prefixes numeric-leading slugs', () => {
    expect(sanitizeSlug('2024_data')).toBe('_2024_data');
  });
});

describe('buildExportNameMap', () => {
  it('assigns sequential steps and readable variable names', () => {
    const map = buildExportNameMap(joinWorkflow);

    expect(map.get('csv-src')).toEqual({
      step: 1,
      varName: 'csv_data_1',
      commentId: '1',
    });
    expect(map.get('json-src')).toEqual({
      step: 2,
      varName: 'json_data_2',
      commentId: '2',
    });
    expect(map.get('join-node')).toEqual({
      step: 3,
      varName: 'joined_3',
      commentId: '3',
    });
  });

  it('prefers explicit exportVarSlug over custom titles', () => {
    const workflow: Workflow = {
      ...joinWorkflow,
      nodes: joinWorkflow.nodes.map((node) =>
        node.id === 'join-node' ? { ...node, title: 'Country Match' } : node,
      ),
    };

    const map = buildExportNameMap(workflow);
    expect(map.get('join-node')?.varName).toBe('joined_3');
  });

  it('produces deterministic names across repeated builds', () => {
    const first = buildExportNameMap(joinWorkflow);
    const second = buildExportNameMap(joinWorkflow);
    expect(first).toEqual(second);
  });
});

describe('export codegen integration', () => {
  it('generates readable variable names and step comments', () => {
    const code = generatePipelineCode(joinWorkflow);

    expect(code).toContain('# Node ID: 1');
    expect(code).toContain('# Node ID: 2');
    expect(code).toContain('# Node ID: 3');
    expect(code).toContain('csv_data_1 = pd.read_csv("sales.csv"');
    expect(code).toContain('json_data_2 = pd.read_json("customers.json"');
    expect(code).toContain('joined_3 = csv_data_1.merge(json_data_2');
  });
});

describe('registered node slugs', () => {
  it('provides default export slugs for every registered node', () => {
    for (const def of Object.values(nodeRegistry)) {
      const slug = def.exportVarSlug ?? getDefaultExportSlug(def.type);
      expect(slug.length).toBeGreaterThan(0);
      expect(sanitizeSlug(slug)).toBe(slug);
    }
  });
});
