// User-facing copy for backend rejections — the ONLY source of rejection
// wording. Components look copy up by reason; they never hardcode strings.
// Both maps are exhaustively keyed by their reason union, so adding a new
// reason to types.ts forces a new entry here (compile error otherwise).
import type {
  ItemLevelRejectionReason,
  AccountLevelRejectionReason,
} from './types';

export interface RejectionCopy {
  title: string;
  body: string;
}

// Item-level: applies to the whole exchange (the person, not one account).
export const ITEM_REJECTION_COPY: Record<ItemLevelRejectionReason, RejectionCopy> = {
  IDENTITY_MISMATCH: {
    title: "We couldn't verify your identity",
    body: "The name on this bank login doesn't match your profile. Connect an account in your own name, or contact support if this looks wrong.",
  },
  SANCTIONS_SCREENING_FAILED: {
    title: "We can't connect this account",
    body: "This account didn't pass a required screening check. Please contact support for help.",
  },
  RISK_THRESHOLD_NOT_MET: {
    title: "We can't connect this account right now",
    body: "This account didn't meet our current requirements for connecting. Try a different account or check back later.",
  },
  AUTH_NOT_SUPPORTED: {
    title: "This institution isn't supported",
    body: "We can't verify accounts at this institution yet. Try connecting an account from a different bank.",
  },
  UNKNOWN: {
    title: "We couldn't connect your account",
    body: 'Something went wrong on our end. Please try again, or contact support if it keeps happening.',
  },
};

// Account-level: applies to a single account within an otherwise-fine
// exchange (the other selected accounts can still link).
export const ACCOUNT_REJECTION_COPY: Record<AccountLevelRejectionReason, RejectionCopy> = {
  DUPLICATE_ACCOUNT: {
    title: 'Already connected',
    body: 'This account is already linked to your profile, so we skipped it.',
  },
  DUPLICATE_AWAITING_VERIFICATION: {
    title: 'Already added',
    body: 'This account is already on your list and waiting to be verified.',
  },
  DUPLICATE_VERIFICATION_IN_PROGRESS: {
    title: 'Verification already underway',
    body: "We're already verifying this account, so we didn't add it again.",
  },
  UNSUPPORTED_ACCOUNT_TYPE: {
    title: 'Account type not supported',
    body: 'We can only connect checking and savings accounts. This account was skipped.',
  },
  UNKNOWN: {
    title: "Couldn't connect this account",
    body: 'Something went wrong connecting this one. The others were unaffected.',
  },
};

export function copyForItemRejection(
  reason: ItemLevelRejectionReason,
): RejectionCopy {
  return ITEM_REJECTION_COPY[reason];
}

export function copyForAccountRejection(
  reason: AccountLevelRejectionReason,
): RejectionCopy {
  return ACCOUNT_REJECTION_COPY[reason];
}
