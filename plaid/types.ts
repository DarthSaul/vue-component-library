// ─────────────────────────────────────────────────────────────
// Plaid SDK — shapes returned by window.Plaid callbacks.
// We type only what we consume; full SDK surface is much larger.
// ─────────────────────────────────────────────────────────────

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
  error_type: string;     // e.g. 'INVALID_LINK_TOKEN'
  error_code: string;
  error_message: string;
  display_message: string | null;
}

export interface PlaidExitMetadata {
  institution: PlaidInstitution | null;
  status: string | null;  // e.g. 'requires_credentials'
  link_session_id: string;
  request_id: string;
}

// Plaid SDK — the handler returned by Plaid.create()
export interface PlaidHandler {
  open: () => void;
  exit: (opts?: { force?: boolean }) => void;
  destroy: () => void;
}

// Plaid SDK — declared on window by the link-initialize.js script
declare global {
  interface Window {
    Plaid?: {
      create: (config: PlaidCreateConfig) => PlaidHandler;
    };
  }
}

export interface PlaidCreateConfig {
  token: string;
  onSuccess: (publicToken: string, metadata: PlaidSuccessMetadata) => void;
  onExit?: (err: PlaidExitError | null, metadata: PlaidExitMetadata) => void;
  onEvent?: (eventName: string, metadata: Record<string, unknown>) => void;
  onLoad?: () => void;
  receivedRedirectUri?: string; // Plaid OAuth — required only on resume
}

// ─────────────────────────────────────────────────────────────
// CNB API — request/response contracts with our backend.
// These are what api.ts speaks; they should match the OpenAPI spec.
// ─────────────────────────────────────────────────────────────

export interface LinkTokenResponse {
  linkToken: string;
  expiration: string; // ISO 8601; Plaid tokens live ~4h
}

// What we send to CNB after Plaid onSuccess.
// Slim — only what backend needs. Mapper builds this from Plaid metadata.
export interface ExchangeRequest {
  publicToken: string;
  institutionId: string | null;
  institutionName: string | null;
  selectedAccount: {
    plaidAccountId: string;
    mask: string | null;
    type: string;
    subtype: string | null;
  };
  linkSessionId: string;
}

// Discriminated union — backend either returns a linked account or
// a typed rejection. Confirm the exact `reason` enum with backend today.
export type ExchangeResponse =
  | { status: 'linked'; account: LinkedAccount }
  | { status: 'pending'; verificationId: string }   // if verification is async
  | { status: 'rejected'; reason: LinkRejectionReason; message: string };

export interface LinkedAccount {
  id: string;
  institutionName: string;
  accountMask: string;
  accountType: string;
  linkedAt: string;
}

export type LinkRejectionReason =
  | 'IDENTITY_MISMATCH'
  | 'UNSUPPORTED_ACCOUNT_TYPE'
  | 'AUTH_NOT_SUPPORTED'
  | 'DUPLICATE_ACCOUNT'
  | 'SANCTIONS_SCREENING_FAILED'
  | 'RISK_THRESHOLD_NOT_MET'
  | 'UNKNOWN';

// ─────────────────────────────────────────────────────────────
// UI state machine — purely client-side.
// ─────────────────────────────────────────────────────────────

export type LinkStatus =
  | 'idle'
  | 'fetching-token'
  | 'ready'           // handler created, awaiting user click
  | 'in-progress'    // Plaid Link is open
  | 'exchanging'     // CNB /exchange in flight
  | 'verifying'      // backend async verification in progress
  | 'linked'
  | 'rejected'
  | 'error';
