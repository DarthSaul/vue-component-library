// User-facing copy for a user-initiated Plaid exit (onExit with err ===
// null). Most cancels are silent — the user meant to back out. Only a few
// exit `status` values are worth surfacing, so this is a Partial map with
// NO generic fallback: an unmapped status returns null, meaning "say
// nothing." That silence is deliberate; don't add a catch-all here.
import type { CopyEntry } from './plaidErrorUI';

export const PLAID_EXIT_STATUS_COPY: Partial<Record<string, CopyEntry>> = {
  institution_not_found: {
    title: "We couldn't find your bank",
    body: "It looks like your bank isn't in our list yet. Try searching a different name, or check back later.",
    retry: 'reopen-link',
  },
};

// Returns null for a plain cancel (status === null) or any status we've
// chosen not to surface. Callers treat null as a silent exit.
export function copyForExitStatus(status: string | null): CopyEntry | null {
  if (status === null) return null;
  return PLAID_EXIT_STATUS_COPY[status] ?? null;
}
