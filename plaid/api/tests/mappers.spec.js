import { describe, it, expect } from 'vitest';
import {
  toExchangeRequest,
  fromExternalTransferAccountDto,
  fromExternalTransferAccountDtoList,
  fromAccountResultDto,
} from '../mappers';

// A representative Plaid onSuccess metadata payload with two selected accounts.
function successMetadata(overrides = {}) {
  return {
    institution: { name: 'Wells Fargo', institution_id: 'ins_wf' },
    accounts: [
      { id: 'plaid_1', name: 'Checking', mask: '4321', type: 'depository', subtype: 'checking' },
      { id: 'plaid_2', name: 'Savings', mask: '9876', type: 'depository', subtype: 'savings' },
    ],
    link_session_id: 'session_abc',
    ...overrides,
  };
}

function accountDto(overrides = {}) {
  return {
    id: 'acc_1',
    institution_id: 'ins_wf',
    institution_name: 'Wells Fargo',
    plaid_account_id: 'plaid_1',
    account_number_suffix: '4321',
    account_type: 'checking',
    current_status: 'active',
    linked_at: '2026-04-12T14:22:00Z',
    ...overrides,
  };
}

describe('toExchangeRequest', () => {
  it('maps ALL selected accounts, not just the first', () => {
    const req = toExchangeRequest('public-token-xyz', successMetadata());

    expect(req.selectedAccounts).toHaveLength(2);
    expect(req.selectedAccounts).toEqual([
      { plaidAccountId: 'plaid_1', mask: '4321', type: 'depository', subtype: 'checking' },
      { plaidAccountId: 'plaid_2', mask: '9876', type: 'depository', subtype: 'savings' },
    ]);
  });

  it('carries publicToken and link_session_id through', () => {
    const req = toExchangeRequest('public-token-xyz', successMetadata());

    expect(req.publicToken).toBe('public-token-xyz');
    expect(req.linkSessionId).toBe('session_abc');
  });

  it('maps institution id and name when present', () => {
    const req = toExchangeRequest('pt', successMetadata());

    expect(req.institutionId).toBe('ins_wf');
    expect(req.institutionName).toBe('Wells Fargo');
  });

  it('handles a null institution by emitting nulls', () => {
    const req = toExchangeRequest('pt', successMetadata({ institution: null }));

    expect(req.institutionId).toBeNull();
    expect(req.institutionName).toBeNull();
  });

  it('throws when metadata carries no accounts', () => {
    expect(() => toExchangeRequest('pt', successMetadata({ accounts: [] }))).toThrow();
  });
});

describe('fromExternalTransferAccountDto', () => {
  it('maps every snake_case field to its camelCase domain field', () => {
    const domain = fromExternalTransferAccountDto(accountDto());

    expect(domain).toEqual({
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

  it('does not leak any snake_case keys into the domain model', () => {
    const domain = fromExternalTransferAccountDto(accountDto());

    expect(Object.keys(domain)).not.toContain('institution_id');
    expect(Object.keys(domain)).not.toContain('account_number_suffix');
    expect(Object.keys(domain)).not.toContain('current_status');
  });

  it('list variant maps every element', () => {
    const list = fromExternalTransferAccountDtoList([
      accountDto({ id: 'acc_1', plaid_account_id: 'plaid_1' }),
      accountDto({ id: 'acc_2', plaid_account_id: 'plaid_2' }),
    ]);

    expect(list).toHaveLength(2);
    expect(list.map((a) => a.id)).toEqual(['acc_1', 'acc_2']);
    expect(list.map((a) => a.plaidAccountId)).toEqual(['plaid_1', 'plaid_2']);
  });

  it('list variant returns an empty array for empty input', () => {
    expect(fromExternalTransferAccountDtoList([])).toEqual([]);
  });
});

describe('fromAccountResultDto', () => {
  it.each([
    {
      outcome: 'linked',
      dto: { plaidAccountId: 'plaid_1', outcome: 'linked', account: accountDto() },
      assert: (result) => {
        expect(result.outcome).toBe('linked');
        // Nested DTO converted to a domain LinkedAccount (camelCase).
        expect(result.account).toEqual({
          id: 'acc_1',
          institutionId: 'ins_wf',
          institutionName: 'Wells Fargo',
          plaidAccountId: 'plaid_1',
          accountMask: '4321',
          accountType: 'checking',
          status: 'active',
          linkedAt: '2026-04-12T14:22:00Z',
        });
      },
    },
    {
      outcome: 'pending',
      dto: { plaidAccountId: 'plaid_2', outcome: 'pending', verificationId: 'ver_9' },
      assert: (result) => {
        expect(result).toEqual({
          plaidAccountId: 'plaid_2',
          outcome: 'pending',
          verificationId: 'ver_9',
        });
      },
    },
    {
      outcome: 'rejected',
      dto: {
        plaidAccountId: 'plaid_3',
        outcome: 'rejected',
        reason: 'DUPLICATE_ACCOUNT',
        message: 'Already linked.',
      },
      assert: (result) => {
        expect(result).toEqual({
          plaidAccountId: 'plaid_3',
          outcome: 'rejected',
          reason: 'DUPLICATE_ACCOUNT',
          message: 'Already linked.',
        });
      },
    },
  ])('maps the $outcome outcome to its domain shape', ({ dto, assert }) => {
    assert(fromAccountResultDto(dto));
  });

  it('preserves plaidAccountId across the linked branch', () => {
    const result = fromAccountResultDto({
      plaidAccountId: 'plaid_1',
      outcome: 'linked',
      account: accountDto(),
    });
    expect(result.plaidAccountId).toBe('plaid_1');
  });
});
