import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useExternalAccountStore } from '../useExternalAccountStore';
import { fetchExternalTransferAccounts } from '../../api/api';

vi.mock('../../api/api', () => ({
  fetchExternalTransferAccounts: vi.fn(),
}));

beforeEach(() => {
  setActivePinia(createPinia());
  vi.clearAllMocks();
});

const ACCOUNTS = [
  {
    id: 'acc_1',
    institutionId: 'ins_wf',
    institutionName: 'Wells Fargo',
    plaidAccountId: 'plaid_1',
    accountMask: '4321',
    accountType: 'checking',
    status: 'active',
    linkedAt: '2026-04-12T14:22:00Z',
  },
];

describe('useExternalAccountStore', () => {
  it('load() success populates accounts, sets hasLoaded, clears isLoading', async () => {
    fetchExternalTransferAccounts.mockResolvedValue(ACCOUNTS);
    const store = useExternalAccountStore();

    await store.load();

    expect(store.accounts).toEqual(ACCOUNTS);
    expect(store.hasLoaded).toBe(true);
    expect(store.isLoading).toBe(false);
    expect(store.error).toBeNull();
  });

  it('load() failure sets error, leaves accounts empty, still clears isLoading', async () => {
    fetchExternalTransferAccounts.mockRejectedValue(new Error('network down'));
    const store = useExternalAccountStore();

    await store.load();

    expect(store.error).toBe('network down');
    expect(store.accounts).toEqual([]);
    expect(store.hasLoaded).toBe(false);
    expect(store.isLoading).toBe(false);
  });

  it('isLoading is true mid-flight', async () => {
    let resolve;
    fetchExternalTransferAccounts.mockReturnValue(
      new Promise((r) => {
        resolve = r;
      }),
    );
    const store = useExternalAccountStore();

    const pending = store.load();
    expect(store.isLoading).toBe(true);

    resolve(ACCOUNTS);
    await pending;
    expect(store.isLoading).toBe(false);
  });
});
