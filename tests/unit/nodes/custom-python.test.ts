import { describe, expect, it } from 'vitest';

import { customPython, isCustomPythonSafe } from '@/nodes/custom-python';

describe('customPython', () => {
  it('wraps user code with out = inp.copy() template', () => {
    const code = customPython.compile(
      { code: 'out["total"] = out["a"] + out["b"]' },
      ['node_a'],
      'node_b',
      {},
    );
    expect(code).toContain('out = node_a.copy()');
    expect(code).toContain('out["total"] = out["a"] + out["b"]');
    expect(code).toContain('node_b = out');
  });

  it('rejects when feature flag is off', () => {
    const errors = customPython.validate({ code: 'out = inp.copy()' }, [[]]);
    expect(errors.some((e) => e.message.includes('disabled'))).toBe(true);
  });

  it('rejects import via isCustomPythonSafe', () => {
    expect(isCustomPythonSafe('import os\nout = inp')).toBe(false);
  });

  it('rejects exec and open patterns', () => {
    expect(isCustomPythonSafe('exec("x")')).toBe(false);
    expect(isCustomPythonSafe('open("/etc/passwd")')).toBe(false);
    expect(isCustomPythonSafe('out = inp.assign(x=1)')).toBe(true);
  });
});
