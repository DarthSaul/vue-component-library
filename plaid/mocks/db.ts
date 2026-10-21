// ─────────────────────────────────────────────────────────────
// MSW in-memory "database"
// ─────────────────────────────────────────────────────────────
//
// State is stored in WIRE format (ExternalTransferAccountDto — snake_case),
// exactly as the real backend would return it. The handlers do no mapping;
// the SPA's api.ts is the layer that maps DTO→domain. Keeping the mock in
// DTO shape means the mock and the real backend are drop-in swappable.
//
// Module-scoped state lives for the lifetime of the tab. We mirror to
// sessionStorage so a reload keeps continuity (add Monday, still there
// Tuesday). sessionStorage (not localStorage) clears when the tab closes,
// so each demo session starts predictably.

import type { ExternalTransferAccountDto } from '../types';

const STORAGE_KEY = 'msw:externalTransferAccounts';

// Seed so the table isn't empty on first load.
const SEED: ExternalTransferAccountDto[] = [
  {
    id: 'acc_seed_1',
    institution_id: 'ins_wells_fargo',
    institution_name: 'Wells Fargo',
    plaid_account_id: 'plaid_seed_1',
    account_number_suffix: '4321',
    account_type: 'checking',
    current_status: 'active',
    linked_at: '2026-04-12T14:22:00Z',
  },
];

function loadInitial(): ExternalTransferAccountDto[] {
  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return [...SEED];
  try {
    return JSON.parse(raw) as ExternalTransferAccountDto[];
  } catch {
    return [...SEED];
  }
}

let accounts: ExternalTransferAccountDto[] = loadInitial();

// Auto-incrementing id for created accounts. Starts at 100 so it can't
// collide with seeded ids.
let idCounter = 100;

function persist(): void {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
}

export const db = {
  list(): ExternalTransferAccountDto[] {
    return accounts;
  },
  add(account: ExternalTransferAccountDto): void {
    accounts = [...accounts, account];
    persist();
  },
  remove(id: string): boolean {
    const before = accounts.length;
    accounts = accounts.filter((a) => a.id !== id);
    if (accounts.length === before) return false;
    persist();
    return true;
  },
  nextId(): number {
    return idCounter++;
  },
  reset(): void {
    accounts = [...SEED];
    sessionStorage.removeItem(STORAGE_KEY);
  },
};
