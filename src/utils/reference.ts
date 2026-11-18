/**
 * Keep the canonical reference untouched for API, payment and audit matching,
 * but omit the legacy year segment wherever a parent sees it.
 */
export function displayReference(reference?: string | null, fallback = '') {
  if (!reference) return fallback;
  return reference.replace(/^([A-Z0-9]+)-\d{4}-/i, '$1-');
}
