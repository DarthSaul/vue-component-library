import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import View from '../manage-external-accounts-plaid.vue';

// Control surface for the mocked composables. usePlaidLink/store/toasts are
// integration boundaries; we mock them and assert on what the view renders
// and which handlers it calls.
const ctrl = vi.hoisted(() => ({
  openSpy: vi.fn(),
  initializeSpy: vi.fn(() => Promise.resolve()),
  storeLoadSpy: vi.fn(() => Promise.resolve()),
  toastsSpy: vi.fn(),
  ready: false,
  presentation: 'none',
}));

vi.mock('../../composables/usePlaidLink', () => ({
  usePlaidLink: () => ({
    initialize: ctrl.initializeSpy,
    open: ctrl.openSpy,
    ready: ctrl.ready,
    itemRejection: { value: null },
    accountResults: { value: null },
    plaidError: { value: null },
    dismissResults: vi.fn(),
    dismissPlaidError: vi.fn(),
    retryPlaidLink: vi.fn(),
  }),
}));

vi.mock('../../composables/useExternalAccountStore', () => ({
  useExternalAccountStore: () => ({
    accounts: [],
    isLoading: false,
    error: null,
    hasLoaded: false,
    load: ctrl.storeLoadSpy,
  }),
}));

vi.mock('../../composables/usePlaidToasts', () => ({
  usePlaidToasts: ctrl.toastsSpy,
  derivePresentation: () => ctrl.presentation,
}));

// Stub child components at the integration boundary; the view's own behavior
// (button state, modal visibility) is what's under test.
const stubs = {
  ExtAccountsDatatable: { name: 'ExtAccountsDatatable', template: '<div class="datatable-stub" />' },
  ExtAccountsResultsModal: { name: 'ExtAccountsResultsModal', template: '<div class="results-modal-stub" />' },
};

function mountView() {
  return mount(View, { global: { stubs } });
}

beforeEach(() => {
  vi.clearAllMocks();
  ctrl.ready = false;
  ctrl.presentation = 'none';
});

describe('manage-external-accounts-plaid — add button', () => {
  it('disables the add button until Link is ready', () => {
    ctrl.ready = false;
    const wrapper = mountView();

    expect(wrapper.find('button').attributes('disabled')).toBeDefined();
  });

  it('enables the add button and calls open() on click once ready', async () => {
    ctrl.ready = true;
    const wrapper = mountView();

    expect(wrapper.find('button').attributes('disabled')).toBeUndefined();

    await wrapper.find('button').trigger('click');
    expect(ctrl.openSpy).toHaveBeenCalled();
  });
});

describe('manage-external-accounts-plaid — results modal visibility', () => {
  it.each([
    ['none', false],
    ['all-success', false],
    ['item-rejection', false],
    ['all-rejected', true],
    ['partial-success', true],
  ])('presentation "%s" → modal rendered: %s', (presentation, visible) => {
    ctrl.presentation = presentation;
    const wrapper = mountView();

    expect(wrapper.find('.results-modal-stub').exists()).toBe(visible);
  });
});

describe('manage-external-accounts-plaid — mount', () => {
  it('initializes Link and loads the account list', async () => {
    mountView();
    await flushPromises();

    expect(ctrl.initializeSpy).toHaveBeenCalled();
    expect(ctrl.storeLoadSpy).toHaveBeenCalled();
  });
});
