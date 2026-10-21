import { useDsToast } from '@ds/vue';
import { copyForItemRejection, copyForAccountRejection } from '../rejectionUI';
import type {
  AccountResult,
  ItemLevelRejectionReason,
  PresentationState,
} from '../types';
import type { ItemRejectionState } from './usePlaidLink';

// usePlaidToasts owns ALL toast emission for the main view. It returns three
// render functions; the view decides WHEN to call them (driven by the
// `presentation` state machine below):
//
//   renderSuccessToast       — one summary success toast for an all-linked batch
//   renderItemRejectionToast — one danger toast for an item-level rejection
//   renderToastsLists        — one toast per account (success per linked,
//                              danger per rejected)

// Pure classifier — shared with the main view, which uses it to decide both
// which toast to render and whether to show the results modal. Side-effect
// free so every caller derives the same state from the same inputs.
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

export function usePlaidToasts() {
  const toast = useDsToast();

  // One summary success toast for a batch that linked cleanly. Single account
  // leads with its institution name; multiple leads with the count.
  function renderSuccessToast(linkedAccounts: AccountResult[]): void {
    const count = linkedAccounts.length;
    const first = linkedAccounts[0];
    const institution =
      first && first.outcome === 'linked' ? first.account.institutionName : undefined;

    toast.success({
      title: count === 1 ? 'Connected 1 account' : `Connected ${count} accounts`,
      message: institution,
    });
  }

  // One danger toast for an item-level rejection, using the mapped copy.
  function renderItemRejectionToast(rejection: {
    reason: ItemLevelRejectionReason;
    message: string;
  }): void {
    const copy = copyForItemRejection(rejection.reason);
    toast.danger({ title: copy.title, message: copy.body });
  }

  // One toast per account: success for each linked, danger for each rejected
  // (with its mapped copy). Used when the caller wants a per-account breakdown
  // in toasts rather than a single summary.
  function renderToastsLists(accounts: AccountResult[]): void {
    accounts.forEach((account) => {
      if (account.outcome === 'linked') {
        toast.success({
          title: 'Account connected',
          message: `${account.account.institutionName} •••• ${account.account.accountMask}`,
        });
      } else if (account.outcome === 'rejected') {
        const copy = copyForAccountRejection(account.reason);
        toast.danger({ title: copy.title, message: copy.body });
      }
    });
  }

  return { renderSuccessToast, renderItemRejectionToast, renderToastsLists };
}
