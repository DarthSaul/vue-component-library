// User-facing copy for Plaid SDK errors surfaced via onExit(err, …).
// Plaid documents ~15+ error codes and can add more, so this is an
// open-universe string map with a generic fallback — NOT an exhaustive
// Record keyed by a union. We deliberately map our own copy rather than
// showing Plaid's `display_message`.
export type RetryAction =
  | 'reopen-link'
  | 'try-later'
  | 'contact-support'
  | 'none';

export interface CopyEntry {
  title: string;
  body: string;
  retry: RetryAction;
}

export const PLAID_ERROR_COPY: Record<string, CopyEntry> = {
  INSTITUTION_DOWN: {
    title: 'This bank is temporarily unavailable',
    body: "Their systems aren't responding right now. Please try again in a little while.",
    retry: 'try-later',
  },
  INSTITUTION_NOT_RESPONDING: {
    title: 'This bank is taking too long to respond',
    body: "We couldn't reach them in time. Please try again in a few minutes.",
    retry: 'try-later',
  },
  INVALID_CREDENTIALS: {
    title: "Those sign-in details didn't work",
    body: 'The username or password was incorrect. Double-check them and try connecting again.',
    retry: 'reopen-link',
  },
  ITEM_LOGIN_REQUIRED: {
    title: 'Please sign in again',
    body: 'Your bank needs you to re-authenticate before we can connect the account.',
    retry: 'reopen-link',
  },
  RATE_LIMIT_EXCEEDED: {
    title: 'Too many attempts',
    body: "You've tried a few times in a row. Please wait a moment before trying again.",
    retry: 'try-later',
  },
};

export const GENERIC_PLAID_ERROR_COPY: CopyEntry = {
  title: 'Something went wrong',
  body: "We couldn't finish connecting your account. Please try again, or contact support if it keeps happening.",
  retry: 'contact-support',
};

export function copyForPlaidError(code: string): CopyEntry {
  return PLAID_ERROR_COPY[code] ?? GENERIC_PLAID_ERROR_COPY;
}
