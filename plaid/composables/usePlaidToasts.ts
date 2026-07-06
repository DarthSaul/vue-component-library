import { computed, watch, type Ref } from 'vue';
import { useDsToast } from '@ds/vue';
import { copyForItemRejection, copyForAccountRejection } from '../rejectionUI';
import type { CopyEntry } from '../plaidErrorUI';
import type { AccountResult, PresentationState } from '../types';
import type { ItemRejectionState } from './usePlaidLink';

// Owns ALL toast routing for the main view. usePlaidLink exposes result
// state only; this composable turns that state into toasts. It watches a
// `presentation` state machine plus the plaidError ref and fires the right
// toast, then dismisses the source state so a toast fires exactly once.
//
// Routing:
//   all-success   → success toast, then dismiss
//   item-rejection → error toast (copyForItemRejection), then dismiss
//   plaidError     → error toast from the CopyEntry, then dismiss
//   all-rejected / partial-success → NO toast (the results modal owns those)

// The subset of usePlaidLink's return that toast routing depends on.
export interface PlaidToastSources {
  itemRejection: Ref<ItemRejectionState | null>;
  accountResults: Ref<AccountResult[] | null>;
  plaidError: Ref<CopyEntry | null>;
  dismissResults: () => void;
  dismissPlaidError: () => void;
}

type DsToastApi = ReturnType<typeof useDsToast>;

// Pure classifier — shared with the main view, which uses it to decide
// whether to show the results modal. Kept side-effect-free so both callers
// derive the same state from the same inputs.
export function derivePresentation(
  itemRejection: ItemRejectionState | null,
  accountResults: AccountResult[] | null,
): PresentationState {
  if (itemRejection) return 'item-rejection';
  if (!accountResults || accountResults.length === 0) return 'none';

  const rejected = accountResults.filter((r) => r.outcome === 'rejected');
  const succeeded = accountResults.filter((r) => r.outcome !== 'rejected');

  if (rejected.length === 0) return 'all-success';
  if (succeeded.length === 0) return 'all-rejected';
  return 'partial-success';
}

function successToastCopy(results: AccountResult[]): { title: string; message?: string } {
  const linked = results.filter((r) => r.outcome === 'linked');
  const count = linked.length;
  const first = linked[0];
  const institution =
    first && first.outcome === 'linked' ? first.account.institutionName : undefined;

  return {
    title: count === 1 ? 'Connected 1 account' : `Connected ${count} accounts`,
    message: institution,
  };
}

export function usePlaidToasts(sources: PlaidToastSources) {
  const toast = useDsToast();

  const presentation = computed(() =>
    derivePresentation(sources.itemRejection.value, sources.accountResults.value),
  );

  // Result-driven toasts (success + item rejection).
  watch(presentation, (state) => {
    if (state === 'all-success') {
      toast.success(successToastCopy(sources.accountResults.value ?? []));
      sources.dismissResults();
      return;
    }

    if (state === 'item-rejection') {
      const rejection = sources.itemRejection.value;
      if (rejection) {
        const copy = copyForItemRejection(rejection.reason);
        toast.error({ title: copy.title, message: copy.body });
      }
      sources.dismissResults();
    }

    // all-rejected / partial-success → handled by the results modal.
  });

  // Plaid SDK error toasts (onExit surfaced a CopyEntry).
  watch(
    () => sources.plaidError.value,
    (copy) => {
      if (!copy) return;
      toast.error({ title: copy.title, message: copy.body });
      sources.dismissPlaidError();
    },
  );

  return { presentation };
}

/**
 * DEMO-ONLY. Not wired into usePlaidToasts by default.
 *
 * Fans out one error toast per rejected account, staggered so they cascade
 * in rather than stacking all at once. Delay is index-based (index * 300ms)
 * — each toast is scheduled at its own offset, not a single constant
 * setTimeout and not a `.forEach(await …)` (which wouldn't actually
 * sequence). Included to show the pattern; the default UX routes multiple
 * rejections to the results modal instead.
 */
export function fanOutRejectionToasts(
  rejected: AccountResult[],
  toast: DsToastApi,
): void {
  rejected
    .filter((r) => r.outcome === 'rejected')
    .forEach((result, index) => {
      if (result.outcome !== 'rejected') return;
      const copy = copyForAccountRejection(result.reason);
      setTimeout(() => {
        toast.error({ title: copy.title, message: copy.body });
      }, index * 300);
    });
}
