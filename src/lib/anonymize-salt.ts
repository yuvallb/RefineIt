const STORAGE_KEY = 'refineit-anonymize-salt';

/** Session-scoped salt for anonymize hash — not persisted in workflow or share URLs. */
export function getOrCreateAnonymizeSalt(): string {
  if (typeof sessionStorage === 'undefined') {
    return 'export-salt-placeholder';
  }

  let salt = sessionStorage.getItem(STORAGE_KEY);
  if (!salt) {
    salt = crypto.randomUUID();
    sessionStorage.setItem(STORAGE_KEY, salt);
  }
  return salt;
}
