import { describe, expect, it } from 'vitest';

import { parsePythonError } from '@/engine/kernel-client';

describe('parsePythonError', () => {
  it('extracts message and traceback from Pyodide-style errors', () => {
    const error = parsePythonError({
      message: 'SyntaxError: invalid syntax',
      traceback: 'Traceback (most recent call last):\n  File "<stdin>"',
    });

    expect(error).toEqual({
      message: 'SyntaxError: invalid syntax',
      traceback: 'Traceback (most recent call last):\n  File "<stdin>"',
    });
  });

  it('handles Error instances', () => {
    const error = parsePythonError(new Error('Worker failed'));
    expect(error.message).toBe('Worker failed');
  });

  it('stringifies unknown values', () => {
    expect(parsePythonError(42).message).toBe('42');
  });
});

describe('kernel-client types', () => {
  it('exports parsePythonError helper', () => {
    expect(typeof parsePythonError).toBe('function');
  });
});
