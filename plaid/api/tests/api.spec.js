import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createLinkToken,
  exchangePublicToken,
  fetchExternalTransferAccounts,
} from '../api';

// Minimal Response stand-in — api.ts only reads .ok, .status, and .json().
function jsonResponse(body, { ok = true, status = 200 } = {}) {
  return { ok, status, json: async () => body };
}

function lastFetchCall() {
  return globalThis.fetch.mock.calls.at(-1);
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('createLinkToken', () => {
  it('POSTs to the link-token endpoint and returns the parsed body', async () => {
    const body = { linkToken: 'link-sandbox-1', expiration: '2026-07-06T18:00:00Z' };
    globalThis.fetch.mockResolvedValue(jsonResponse(body));

    const result = await createLinkToken();

    const [url, init] = lastFetchCall();
    expect(url).toBe('/api/connect-bank/link-token');
    expect(init.method).toBe('POST');
    expect(result).toEqual(body);
  });

  it('throws when the response is not ok', async () => {
    globalThis.fetch.mockResolvedValue(jsonResponse(null, { ok: false, status: 500 }));
    await expect(createLinkToken()).rejects.toThrow();
  });
});

describe('exchangePublicToken', () => {
  const request = {
    publicToken: 'pt-1',
    institutionId: 'ins_wf',
    institutionName: 'Wells Fargo',
    selectedAccounts: [
      { plaidAccountId: 'plaid_1', mask: '4321', type: 'depository', subtype: 'checking' },
    ],
    linkSessionId: 'session_abc',
  };

  it('sends the Idempotency-Key header and the selectedAccounts body', async () => {
    globalThis.fetch.mockResolvedValue(jsonResponse({ status: 'completed', results: [] }));

    await exchangePublicToken(request, 'session_abc');

    const [url, init] = lastFetchCall();
    expect(url).toBe('/api/connect-bank/exchange');
    expect(init.method).toBe('POST');
    expect(init.headers['Idempotency-Key']).toBe('session_abc');
    expect(JSON.parse(init.body).selectedAccounts).toEqual(request.selectedAccounts);
  });

  it('returns DOMAIN-shaped results for a completed exchange (mapping seam)', async () => {
    globalThis.fetch.mockResolvedValue(
      jsonResponse({
        status: 'completed',
        results: [
          {
            plaidAccountId: 'plaid_1',
            outcome: 'linked',
            account: {
              id: 'acc_1',
              institution_id: 'ins_wf',
              institution_name: 'Wells Fargo',
              plaid_account_id: 'plaid_1',
              account_number_suffix: '4321',
              account_type: 'checking',
              current_status: 'active',
              linked_at: '2026-04-12T14:22:00Z',
            },
          },
        ],
      }),
    );

    const result = await exchangePublicToken(request, 'session_abc');

    expect(result.status).toBe('completed');
    // Proves the DTO→domain mapping happened inside api.ts: camelCase, no
    // snake_case keys leak out.
    expect(result.results[0].account).toEqual({
      id: 'acc_1',
      institutionId: 'ins_wf',
      institutionName: 'Wells Fargo',
      plaidAccountId: 'plaid_1',
      accountMask: '4321',
      accountType: 'checking',
      status: 'active',
      linkedAt: '2026-04-12T14:22:00Z',
    });
  });

  it('passes a rejected_at_item response through unchanged', async () => {
    globalThis.fetch.mockResolvedValue(
      jsonResponse({
        status: 'rejected_at_item',
        reason: 'IDENTITY_MISMATCH',
        message: 'Name mismatch.',
      }),
    );

    const result = await exchangePublicToken(request, 'session_abc');

    expect(result).toEqual({
      status: 'rejected_at_item',
      reason: 'IDENTITY_MISMATCH',
      message: 'Name mismatch.',
    });
  });

  it('throws when the response is not ok', async () => {
    globalThis.fetch.mockResolvedValue(jsonResponse(null, { ok: false, status: 502 }));
    await expect(exchangePublicToken(request, 'session_abc')).rejects.toThrow();
  });
});

describe('fetchExternalTransferAccounts', () => {
  it('returns domain models, not DTOs', async () => {
    globalThis.fetch.mockResolvedValue(
      jsonResponse([
        {
          id: 'acc_1',
          institution_id: 'ins_wf',
          institution_name: 'Wells Fargo',
          plaid_account_id: 'plaid_1',
          account_number_suffix: '4321',
          account_type: 'checking',
          current_status: 'active',
          linked_at: '2026-04-12T14:22:00Z',
        },
      ]),
    );

    const accounts = await fetchExternalTransferAccounts();

    const [url] = lastFetchCall();
    expect(url).toBe('/api/v2/external-transfer-accounts');
    expect(accounts[0]).toEqual({
      id: 'acc_1',
      institutionId: 'ins_wf',
      institutionName: 'Wells Fargo',
      plaidAccountId: 'plaid_1',
      accountMask: '4321',
      accountType: 'checking',
      status: 'active',
      linkedAt: '2026-04-12T14:22:00Z',
    });
  });

  it('throws when the response is not ok', async () => {
    globalThis.fetch.mockResolvedValue(jsonResponse(null, { ok: false, status: 404 }));
    await expect(fetchExternalTransferAccounts()).rejects.toThrow();
  });
});
