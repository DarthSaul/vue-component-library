// ─────────────────────────────────────────────────────────────
// SECTION 1 — Plaid SDK shapes
// ─────────────────────────────────────────────────────────────
// Shapes returned by / passed to window.Plaid. We type only what we
// consume; the full SDK surface is much larger. These mirror Plaid's
// vocabulary exactly (snake_case as Plaid emits it) and never leak
// past usePlaidLink + the mappers.

export interface PlaidAccount {
  id: string;
  name: string;
  mask: string | null;
  type: 'depository' | 'credit' | 'loan' | 'investment' | 'other';
  subtype: string | null;
}

export interface PlaidInstitution {
  name: string;
  institution_id: string;
}

export interface PlaidSuccessMetadata {
  institution: PlaidInstitution | null;
  accounts: PlaidAccount[];
  link_session_id: string;
}

export interface PlaidExitError {
  error_type: string; // e.g. 'ITEM_ERROR', 'INSTITUTION_ERROR'
  error_code: string; // e.g. 'INVALID_CREDENTIALS', 'INSTITUTION_DOWN'
  error_message: string;
  display_message: string | null;
}

export interface PlaidExitMetadata {
  institution: PlaidInstitution | null;
  status: string | null; // where in the flow the user exited
  link_session_id: string;
  request_id: string;
}

// The handler returned by Plaid.create().
export interface PlaidHandler {
  open: () => void;
  exit: (opts?: { force?: boolean }) => void;
  destroy: () => void;
}

export interface PlaidCreateConfig {
  token: string;
  onSuccess: (publicToken: string, metadata: PlaidSuccessMetadata) => void;
  onExit?: (err: PlaidExitError | null, metadata: PlaidExitMetadata) => void;
  onEvent?: (eventName: string, metadata: Record<string, unknown>) => void;
  onLoad?: () => void;
  receivedRedirectUri?: string; // OAuth — required only on resume
}

// Declared on window by the link-initialize.js script tag.
declare global {
  interface Window {
    Plaid?: {
      create: (config: PlaidCreateConfig) => PlaidHandler;
    };
  }
}

// ─────────────────────────────────────────────────────────────
// SECTION 2 — Wire DTOs
// ─────────────────────────────────────────────────────────────
// The exact JSON shapes the backend speaks. `*Dto` types are the
// backend's snake_case wire format and must NOT be imported outside
// api/, mappers, and the MSW mocks. camelCase request/response shapes
// here are still wire contracts (what api.ts sends/receives) — kept
// deliberately separate from the domain models in Section 3 even where
// the shapes currently coincide, so backend drift surfaces as a
// compile error instead of a silent mismatch.

export type AccountStatus =
  | 'active'
  | 'pending_verification'
  | 'verification_failed'
  | 'disconnected';

// The persisted linked-account record, exactly as the backend returns it.
export interface ExternalTransferAccountDto {
  id: string;
  institution_id: string;
  institution_name: string;
  plaid_account_id: string;
  account_number_suffix: string;
  account_type: string;
  current_status: AccountStatus;
  linked_at: string; // ISO 8601
}

export interface LinkTokenResponse {
  linkToken: string;
  expiration: string; // ISO 8601; Plaid tokens live ~4h
}

// One account the user selected inside Plaid Link, slimmed to what the
// backend needs to exchange it.
export interface SelectedAccount {
  plaidAccountId: string;
  mask: string | null;
  type: string;
  subtype: string | null;
}

// What we POST to the backend after Plaid onSuccess. Multi-account:
// Plaid can hand back more than one selected account per Link session.
export interface ExchangeRequest {
  publicToken: string;
  institutionId: string | null;
  institutionName: string | null;
  selectedAccounts: SelectedAccount[];
  linkSessionId: string;
}

// Rejections come at two altitudes. An item-level rejection kills the
// whole exchange (identity/sanctions/risk apply to the person, not one
// account). Account-level rejections are per-account and don't block
// the others.
export type ItemLevelRejectionReason =
  | 'IDENTITY_MISMATCH'
  | 'SANCTIONS_SCREENING_FAILED'
  | 'RISK_THRESHOLD_NOT_MET'
  | 'AUTH_NOT_SUPPORTED'
  | 'UNKNOWN';

export type AccountLevelRejectionReason =
  | 'DUPLICATE_ACCOUNT'
  | 'DUPLICATE_AWAITING_VERIFICATION'
  | 'DUPLICATE_VERIFICATION_IN_PROGRESS'
  | 'UNSUPPORTED_ACCOUNT_TYPE'
  | 'UNKNOWN';

// Per-account outcome, discriminated on `outcome`.
export type AccountResultDto =
  | { plaidAccountId: string; outcome: 'linked'; account: ExternalTransferAccountDto }
  | { plaidAccountId: string; outcome: 'pending'; verificationId: string }
  | {
      plaidAccountId: string;
      outcome: 'rejected';
      reason: AccountLevelRejectionReason;
      message: string;
    };

// The exchange response, discriminated on `status`. An item-level
// rejection short-circuits per-account processing, so it carries no
// `results` array.
export type ExchangeResponse =
  | { status: 'rejected_at_item'; reason: ItemLevelRejectionReason; message: string }
  | { status: 'completed'; results: AccountResultDto[] };

// ─────────────────────────────────────────────────────────────
// SECTION 3 — Domain models + UI state
// ─────────────────────────────────────────────────────────────
// camelCase models the app actually renders and reasons about. Mappers
// in api/mappers.ts are the only seam that turns a `*Dto` into one of
// these.

export interface LinkedAccount {
  id: string;
  institutionId: string;
  institutionName: string;
  plaidAccountId: string;
  accountMask: string;
  accountType: string;
  status: AccountStatus;
  linkedAt: string;
}

// Same discriminated union as AccountResultDto, but the `linked` branch
// carries a domain LinkedAccount instead of the wire DTO.
export type AccountResult =
  | { plaidAccountId: string; outcome: 'linked'; account: LinkedAccount }
  | { plaidAccountId: string; outcome: 'pending'; verificationId: string }
  | {
      plaidAccountId: string;
      outcome: 'rejected';
      reason: AccountLevelRejectionReason;
      message: string;
    };

// Same union as ExchangeResponse, but `completed` carries domain
// AccountResult[].
export type ExchangeResult =
  | { status: 'rejected_at_item'; reason: ItemLevelRejectionReason; message: string }
  | { status: 'completed'; results: AccountResult[] };

// The main view's result-presentation state machine. Drives which
// surface (toast vs. modal vs. nothing) shows after an exchange.
export type PresentationState =
  | 'none'
  | 'all-success'
  | 'item-rejection'
  | 'all-rejected'
  | 'partial-success';
