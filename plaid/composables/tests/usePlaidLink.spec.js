import { describe, it, expect, vi, beforeEach } from 'vitest';
import { defineComponent, h } from 'vue';
import { mount, flushPromises } from '@vue/test-utils';
import { usePlaidLink } from '../usePlaidLink';
import { createLinkToken, exchangePublicToken } from '../../api/api';
import { loadPlaidScript } from '../../loadPlaidScript';
import { copyForPlaidError, GENERIC_PLAID_ERROR_COPY } from '../../plaidErrorUI';
import { PLAID_EXIT_STATUS_COPY } from '../../plaidExitUI';

// Store the linked-account list refresh is delegated to; capture its load spy.
const { storeLoad } = vi.hoisted(() => ({ storeLoad: vi.fn() }));

vi.mock('../../api/api', () => ({
  createLinkToken: vi.fn(),
  exchangePublicToken: vi.fn(),
}));
vi.mock('../../loadPlaidScript', () => ({
  loadPlaidScript: vi.fn(() => Promise.resolve()),
}));
vi.mock('../useExternalAccountStore', () => ({
  useExternalAccountStore: () => ({ load: storeLoad }),
}));

// window.Plaid stub — captures the create() config so tests can drive the
// SDK callbacks (onSuccess/onExit/onLoad), and hands back handler spies.
let capturedConfig;
let handler;

function stubPlaid() {
  capturedConfig = null;
  handler = { open: vi.fn(), exit: vi.fn(), destroy: vi.fn() };
  window.Plaid = {
    create: vi.fn((config) => {
      capturedConfig = config;
      return handler;
    }),
  };
}

// Mount usePlaidLink inside a host component so lifecycle hooks
// (onBeforeUnmount) register and fire like they would in a real view.
function mountLink() {
  let link;
  const wrapper = mount(
    defineComponent({
      setup() {
        link = usePlaidLink();
        return () => h('div');
      },
    }),
  );
  return { link, wrapper };
}

function successMetadata() {
  return {
    institution: { name: 'Wells Fargo', institution_id: 'ins_wf' },
    accounts: [
      { id: 'plaid_1', name: 'Checking', mask: '4321', type: 'depository', subtype: 'checking' },
    ],
    link_session_id: 'session_abc',
  };
}

function linkedResult(plaidAccountId = 'plaid_1') {
  return {
    plaidAccountId,
    outcome: 'linked',
    account: { plaidAccountId, institutionName: 'Wells Fargo', accountMask: '4321' },
  };
}

function rejectedResult(plaidAccountId = 'plaid_1') {
  return { plaidAccountId, outcome: 'rejected', reason: 'DUPLICATE_ACCOUNT', message: 'dupe' };
}

beforeEach(() => {
  vi.clearAllMocks();
  stubPlaid();
  createLinkToken.mockResolvedValue({ linkToken: 'tok-1', expiration: 'exp' });
});

describe('initialize()', () => {
  it('loads the script, fetches a token, and creates the handler with it', async () => {
    const { link } = mountLink();

    await link.initialize();

    expect(loadPlaidScript).toHaveBeenCalled();
    expect(createLinkToken).toHaveBeenCalled();
    expect(window.Plaid.create).toHaveBeenCalledWith(
      expect.objectContaining({ token: 'tok-1' }),
    );
  });

  it('flips ready to true only once onLoad fires', async () => {
    const { link } = mountLink();

    await link.initialize();
    expect(link.ready.value).toBe(false);

    capturedConfig.onLoad();
    expect(link.ready.value).toBe(true);
  });
});

describe('open()', () => {
  it('throws when called before initialize()', () => {
    const { link } = mountLink();
    expect(() => link.open()).toThrow();
  });

  it('opens the handler after initialize()', async () => {
    const { link } = mountLink();
    await link.initialize();

    link.open();
    expect(handler.open).toHaveBeenCalled();
  });
});

describe('onSuccess flow', () => {
  it('sets accountResults from a completed exchange', async () => {
    exchangePublicToken.mockResolvedValue({
      status: 'completed',
      results: [linkedResult()],
    });
    const { link } = mountLink();
    await link.initialize();

    capturedConfig.onSuccess('public-token', successMetadata());
    await flushPromises();

    expect(link.accountResults.value).toEqual([linkedResult()]);
    expect(link.itemRejection.value).toBeNull();
  });

  it('exchanges using link_session_id as the idempotency key', async () => {
    exchangePublicToken.mockResolvedValue({ status: 'completed', results: [linkedResult()] });
    const { link } = mountLink();
    await link.initialize();

    capturedConfig.onSuccess('public-token', successMetadata());
    await flushPromises();

    expect(exchangePublicToken).toHaveBeenCalledWith(
      expect.objectContaining({ linkSessionId: 'session_abc' }),
      'session_abc',
    );
  });

  it('sets itemRejection from a rejected_at_item exchange', async () => {
    exchangePublicToken.mockResolvedValue({
      status: 'rejected_at_item',
      reason: 'IDENTITY_MISMATCH',
      message: 'Name mismatch.',
    });
    const { link } = mountLink();
    await link.initialize();

    capturedConfig.onSuccess('public-token', successMetadata());
    await flushPromises();

    expect(link.itemRejection.value).toEqual({
      reason: 'IDENTITY_MISMATCH',
      message: 'Name mismatch.',
    });
    expect(link.accountResults.value).toBeNull();
  });

  it('refreshes the account list when at least one account linked', async () => {
    exchangePublicToken.mockResolvedValue({
      status: 'completed',
      results: [linkedResult('plaid_1'), rejectedResult('plaid_2')],
    });
    const { link } = mountLink();
    await link.initialize();

    capturedConfig.onSuccess('public-token', successMetadata());
    await flushPromises();

    expect(storeLoad).toHaveBeenCalled();
  });

  it('does NOT refresh the list when nothing linked', async () => {
    exchangePublicToken.mockResolvedValue({
      status: 'completed',
      results: [rejectedResult()],
    });
    const { link } = mountLink();
    await link.initialize();

    capturedConfig.onSuccess('public-token', successMetadata());
    await flushPromises();

    expect(storeLoad).not.toHaveBeenCalled();
  });
});

describe('handleExit', () => {
  async function initAndExit(err, metadata) {
    const { link } = mountLink();
    await link.initialize();
    capturedConfig.onExit(err, metadata);
    return link;
  }

  it('stays silent on a plain cancel with an unmapped status', async () => {
    const link = await initAndExit(null, {
      status: 'requires_credentials',
      institution: null,
      link_session_id: 's',
      request_id: 'r',
    });
    expect(link.plaidError.value).toBeNull();
  });

  it('surfaces mapped copy on cancel with status institution_not_found', async () => {
    const link = await initAndExit(null, {
      status: 'institution_not_found',
      institution: null,
      link_session_id: 's',
      request_id: 'r',
    });
    expect(link.plaidError.value).toEqual(PLAID_EXIT_STATUS_COPY.institution_not_found);
  });

  it('surfaces copyForPlaidError when an error is present', async () => {
    const link = await initAndExit(
      { error_type: 'ITEM_ERROR', error_code: 'INVALID_CREDENTIALS', error_message: 'm', display_message: null },
      { status: null, institution: null, link_session_id: 's', request_id: 'r' },
    );
    expect(link.plaidError.value).toEqual(copyForPlaidError('INVALID_CREDENTIALS'));
  });

  it('falls back to generic copy for an unmapped error code', async () => {
    const link = await initAndExit(
      { error_type: 'API_ERROR', error_code: 'SOME_UNMAPPED_CODE', error_message: 'm', display_message: null },
      { status: null, institution: null, link_session_id: 's', request_id: 'r' },
    );
    expect(link.plaidError.value).toEqual(GENERIC_PLAID_ERROR_COPY);
  });
});

describe('teardown', () => {
  it('destroys the handler on unmount', async () => {
    const { link, wrapper } = mountLink();
    await link.initialize();

    wrapper.unmount();
    expect(handler.destroy).toHaveBeenCalled();
  });
});
