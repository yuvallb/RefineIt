import type { ValidationError } from './types';

export const LLM_NOT_IMPLEMENTED =
  'Not implemented yet. Will require LLM API key and provider.';

export function llmMethodError(field = 'method'): ValidationError[] {
  return [{ field, message: LLM_NOT_IMPLEMENTED }];
}

export const ANONYMIZE_REGEX_PRESETS: Record<string, string> = {
  email: String.raw`[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}`,
  phone: String.raw`\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b`,
  ssn: String.raw`\b\d{3}-\d{2}-\d{4}\b`,
  credit_card: String.raw`\b(?:\d[ -]*?){13,19}\b`,
};
