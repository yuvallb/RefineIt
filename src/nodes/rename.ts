import { parseStringRecord } from './column-utils';
import type { NodeDefinition } from './types';

export const rename: NodeDefinition = {
  type: 'rename',
  label: 'Rename',
  category: 'transform',
  inputs: [{ id: 'input', label: 'Input' }],
  outputs: 1,

  defaultConfig() {
    return { mapping: {} as Record<string, string> };
  },

  validate(config, inputSchemas) {
    const errors = [];
    const mapping = parseStringRecord(config.mapping);
    const upstream = inputSchemas[0] ?? [];
    const colNames = new Set(upstream.map((c) => c.name));
    const entries = Object.entries(mapping);

    if (entries.length === 0) {
      errors.push({ field: 'mapping', message: 'Add at least one column rename' });
    }

    const newNames = new Set<string>();
    for (const [from, to] of entries) {
      if (!from) {
        errors.push({ field: 'mapping', message: 'Source column is required' });
        continue;
      }
      if (!to) {
        errors.push({ field: 'mapping', message: 'New column name is required' });
        continue;
      }
      if (upstream.length > 0 && !colNames.has(from)) {
        errors.push({ field: 'mapping', message: `Column "${from}" not found upstream` });
      }
      if (newNames.has(to)) {
        errors.push({ field: 'mapping', message: `Duplicate target name "${to}"` });
      }
      newNames.add(to);
    }

    return errors;
  },

  compile(config, inputVars, outputVar) {
    const mapping = parseStringRecord(config.mapping);
    const input = inputVars[0];
    const entries = Object.entries(mapping)
      .map(([from, to]) => `${JSON.stringify(from)}: ${JSON.stringify(to)}`)
      .join(', ');
    return `${outputVar} = ${input}.rename(columns={${entries}})`;
  },

  inspectorSchema() {
    return [{ kind: 'mapping', key: 'mapping', label: 'Column mapping' }];
  },

  configSummary(config) {
    const mapping = parseStringRecord(config.mapping);
    const entries = Object.entries(mapping);
    if (entries.length === 0) return 'No renames';
    const first = entries[0];
    const suffix = entries.length > 1 ? ` (+${entries.length - 1})` : '';
    return `${first[0]} → ${first[1]}${suffix}`;
  },
};
