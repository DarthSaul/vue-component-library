import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ref, nextTick } from 'vue';
import { useDsToast } from '@ds/vue';
import {
  usePlaidToasts,
  fanOutRejectionToasts,
} from '../usePlaidToasts';
import { copyForItemRejection, copyForAccountRejection } from '../../rejectionUI';

vi.mock('@ds/vue', () => ({
  useDsToast: vi.fn(),
}));

let toast;

beforeEach(() => {
  toast = { success: vi.fn(), error: vi.fn(), dismiss: vi.fn() };
  useDsToast.mockReturnValue(toast);
});

function linked(institutionName, plaidAccountId = 'plaid_1') {
  return {
    plaidAccountId,
    outcome: 'linked',
    account: { plaidAccountId, institutionName, accountMask: '4321' },
  };
}

function rejected(reason = 'DUPLICATE_ACCOUNT', plaidAccountId = 'plaid_x') {
  return { plaidAccountId, outcome: 'rejected', reason, message: 'nope' };
}

function makeSources(overrides = {}) {
  return {
    itemRejection: ref(null),
    accountResults: ref(null),
    plaidError: ref(null),
    dismissResults: vi.fn(),
    dismissPlaidError: vi.fn(),
    ...overrides,
  };
}

describe('usePlaidToasts — presentation → toast routing', () => {
  it.each([
    {
      name: 'all-success',
      apply: (s) => {
        s.accountResults.value = [linked('Wells Fargo')];
      },
      fires: 'success',
    },
    {
      name: 'item-rejection',
      apply: (s) => {
        s.itemRejection.value = { reason: 'IDENTITY_MISMATCH', message: 'x' };
      },
      fires: 'error',
    },
    {
      name: 'all-rejected',
      apply: (s) => {
        s.accountResults.value = [rejected()];
      },
      fires: 'none',
    },
    {
      name: 'partial-success',
      apply: (s) => {
        s.accountResults.value = [linked('Wells Fargo'), rejected()];
      },
      fires: 'none',
    },
    {
      name: 'none',
      apply: (s) => {
        s.accountResults.value = [];
      },
      fires: 'none',
    },
  ])('$name fires the $fires toast', async ({ apply, fires }) => {
    const sources = makeSources();
    usePlaidToasts(sources);

    apply(sources);
    await nextTick();

    if (fires === 'success') {
      expect(toast.success).toHaveBeenCalledTimes(1);
      expect(toast.error).not.toHaveBeenCalled();
    } else if (fires === 'error') {
      expect(toast.error).toHaveBeenCalledTimes(1);
      expect(toast.success).not.toHaveBeenCalled();
    } else {
      expect(toast.success).not.toHaveBeenCalled();
      expect(toast.error).not.toHaveBeenCalled();
    }
  });

  it('item-rejection toast uses the mapped copy for the reason', async () => {
    const sources = makeSources();
    usePlaidToasts(sources);

    sources.itemRejection.value = { reason: 'SANCTIONS_SCREENING_FAILED', message: 'x' };
    await nextTick();

    const copy = copyForItemRejection('SANCTIONS_SCREENING_FAILED');
    expect(toast.error).toHaveBeenCalledWith({ title: copy.title, message: copy.body });
  });
});

describe('usePlaidToasts — success copy', () => {
  it('single linked account uses the institution name', async () => {
    const sources = makeSources();
    usePlaidToasts(sources);

    sources.accountResults.value = [linked('Wells Fargo')];
    await nextTick();

    expect(toast.success).toHaveBeenCalledWith({
      title: 'Connected 1 account',
      message: 'Wells Fargo',
    });
  });

  it('multiple linked accounts use a count', async () => {
    const sources = makeSources();
    usePlaidToasts(sources);

    sources.accountResults.value = [
      linked('Wells Fargo', 'plaid_1'),
      linked('Wells Fargo', 'plaid_2'),
    ];
    await nextTick();

    expect(toast.success).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Connected 2 accounts' }),
    );
  });
});

describe('usePlaidToasts — dismissal', () => {
  it('dismisses results after an all-success toast', async () => {
    const sources = makeSources();
    usePlaidToasts(sources);

    sources.accountResults.value = [linked('Wells Fargo')];
    await nextTick();

    expect(sources.dismissResults).toHaveBeenCalled();
  });

  it('dismisses results after an item-rejection toast', async () => {
    const sources = makeSources();
    usePlaidToasts(sources);

    sources.itemRejection.value = { reason: 'UNKNOWN', message: 'x' };
    await nextTick();

    expect(sources.dismissResults).toHaveBeenCalled();
  });

  it('a Plaid error surfaces an error toast from the CopyEntry, then dismisses it', async () => {
    const sources = makeSources();
    usePlaidToasts(sources);

    const copy = { title: 'Bank down', body: 'Try later', retry: 'try-later' };
    sources.plaidError.value = copy;
    await nextTick();

    expect(toast.error).toHaveBeenCalledWith({ title: 'Bank down', message: 'Try later' });
    expect(sources.dismissPlaidError).toHaveBeenCalled();
  });
});

describe('fanOutRejectionToasts (demo-only helper)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('staggers one toast per rejected account at index * 300ms', () => {
    const rejections = [
      rejected('DUPLICATE_ACCOUNT', 'a'),
      rejected('UNSUPPORTED_ACCOUNT_TYPE', 'b'),
      rejected('UNKNOWN', 'c'),
    ];

    fanOutRejectionToasts(rejections, toast);

    // Nothing has fired until timers advance.
    expect(toast.error).toHaveBeenCalledTimes(0);

    vi.advanceTimersByTime(0);
    expect(toast.error).toHaveBeenCalledTimes(1);
    // First toast carries the first reason's mapped copy.
    const firstCopy = copyForAccountRejection('DUPLICATE_ACCOUNT');
    expect(toast.error).toHaveBeenNthCalledWith(1, {
      title: firstCopy.title,
      message: firstCopy.body,
    });

    vi.advanceTimersByTime(300);
    expect(toast.error).toHaveBeenCalledTimes(2);

    vi.advanceTimersByTime(300);
    expect(toast.error).toHaveBeenCalledTimes(3);
  });
});
