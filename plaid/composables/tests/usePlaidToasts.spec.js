import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useDsToast } from '@ds/vue';
import { usePlaidToasts, derivePresentation } from '../usePlaidToasts';
import { copyForItemRejection, copyForAccountRejection } from '../../rejectionUI';

vi.mock('@ds/vue', () => ({
  useDsToast: vi.fn(),
}));

let toast;

beforeEach(() => {
  toast = { success: vi.fn(), danger: vi.fn(), dismiss: vi.fn() };
  useDsToast.mockReturnValue(toast);
});

function linked(institutionName, plaidAccountId = 'plaid_1', accountMask = '4321') {
  return {
    plaidAccountId,
    outcome: 'linked',
    account: { plaidAccountId, institutionName, accountMask },
  };
}

function rejected(reason = 'DUPLICATE_ACCOUNT', plaidAccountId = 'plaid_x') {
  return { plaidAccountId, outcome: 'rejected', reason, message: 'raw backend message' };
}

describe('renderSuccessToast', () => {
  it('fires a single success toast with the institution name for one account', () => {
    const { renderSuccessToast } = usePlaidToasts();

    renderSuccessToast([linked('Wells Fargo')]);

    expect(toast.success).toHaveBeenCalledTimes(1);
    expect(toast.success).toHaveBeenCalledWith({
      title: 'Connected 1 account',
      message: 'Wells Fargo',
    });
  });

  it('fires a single success toast with a count for multiple accounts', () => {
    const { renderSuccessToast } = usePlaidToasts();

    renderSuccessToast([
      linked('Wells Fargo', 'plaid_1'),
      linked('Wells Fargo', 'plaid_2'),
    ]);

    expect(toast.success).toHaveBeenCalledTimes(1);
    expect(toast.success).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Connected 2 accounts' }),
    );
  });

  it('only calls toast.success (never danger)', () => {
    const { renderSuccessToast } = usePlaidToasts();

    renderSuccessToast([linked('Wells Fargo')]);

    expect(toast.danger).not.toHaveBeenCalled();
  });
});

describe('renderItemRejectionToast', () => {
  it.each([
    'IDENTITY_MISMATCH',
    'SANCTIONS_SCREENING_FAILED',
    'RISK_THRESHOLD_NOT_MET',
    'AUTH_NOT_SUPPORTED',
    'UNKNOWN',
  ])('fires a danger toast with the mapped copy for reason %s', (reason) => {
    const { renderItemRejectionToast } = usePlaidToasts();
    const copy = copyForItemRejection(reason);

    renderItemRejectionToast({ reason, message: 'x' });

    expect(toast.danger).toHaveBeenCalledTimes(1);
    expect(toast.danger).toHaveBeenCalledWith({ title: copy.title, message: copy.body });
  });

  it('only calls toast.danger (never success)', () => {
    const { renderItemRejectionToast } = usePlaidToasts();

    renderItemRejectionToast({ reason: 'IDENTITY_MISMATCH', message: 'x' });

    expect(toast.success).not.toHaveBeenCalled();
  });
});

describe('renderToastsLists', () => {
  it('fires a success toast for each linked account and a danger toast for each rejected', () => {
    const { renderToastsLists } = usePlaidToasts();

    renderToastsLists([
      linked('Wells Fargo', 'plaid_1'),
      rejected('DUPLICATE_ACCOUNT', 'plaid_2'),
      linked('Chase', 'plaid_3'),
    ]);

    expect(toast.success).toHaveBeenCalledTimes(2);
    expect(toast.danger).toHaveBeenCalledTimes(1);
  });

  it('uses the mapped account-rejection copy for a rejected account', () => {
    const { renderToastsLists } = usePlaidToasts();
    const copy = copyForAccountRejection('UNSUPPORTED_ACCOUNT_TYPE');

    renderToastsLists([rejected('UNSUPPORTED_ACCOUNT_TYPE')]);

    expect(toast.danger).toHaveBeenCalledWith({ title: copy.title, message: copy.body });
    // The raw backend message is never surfaced — copy comes from the map.
    expect(toast.danger).not.toHaveBeenCalledWith(
      expect.objectContaining({ message: 'raw backend message' }),
    );
  });

  it('fires only success toasts when every account linked', () => {
    const { renderToastsLists } = usePlaidToasts();

    renderToastsLists([linked('Wells Fargo', 'plaid_1'), linked('Chase', 'plaid_2')]);

    expect(toast.success).toHaveBeenCalledTimes(2);
    expect(toast.danger).not.toHaveBeenCalled();
  });

  it('fires only danger toasts when every account was rejected', () => {
    const { renderToastsLists } = usePlaidToasts();

    renderToastsLists([rejected('DUPLICATE_ACCOUNT', 'a'), rejected('UNKNOWN', 'b')]);

    expect(toast.danger).toHaveBeenCalledTimes(2);
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('fires nothing for an empty list', () => {
    const { renderToastsLists } = usePlaidToasts();

    renderToastsLists([]);

    expect(toast.success).not.toHaveBeenCalled();
    expect(toast.danger).not.toHaveBeenCalled();
  });
});

describe('derivePresentation', () => {
  it.each([
    ['item-rejection', { reason: 'IDENTITY_MISMATCH', message: 'x' }, null, 'item-rejection'],
    ['no results', null, null, 'none'],
    ['empty results', null, [], 'none'],
    ['all linked', null, [linked('WF', 'a')], 'all-success'],
    ['all rejected', null, [rejected('UNKNOWN', 'a')], 'all-rejected'],
    ['mixed', null, [linked('WF', 'a'), rejected('UNKNOWN', 'b')], 'partial-success'],
  ])('classifies %s as %s', (_name, itemRejection, accountResults, expected) => {
    expect(derivePresentation(itemRejection, accountResults)).toBe(expected);
  });

  it('item rejection takes precedence over any account results', () => {
    const state = derivePresentation(
      { reason: 'UNKNOWN', message: 'x' },
      [linked('WF', 'a')],
    );
    expect(state).toBe('item-rejection');
  });
});
