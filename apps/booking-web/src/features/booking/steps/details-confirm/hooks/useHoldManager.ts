import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiDelete } from '../../../../../lib/api';
import type { BookingDraft } from '../../../types';
import { computeHoldRemaining } from '../details-confirm.utils';

export function useHoldManager(draft: BookingDraft, updateDraft: (patch: Partial<BookingDraft>) => void) {
  const [holdRemainingMs, setHoldRemainingMs] = useState<number>(() => computeHoldRemaining(draft.holdExpiresAt));

  useEffect(() => {
    if (!draft.holdExpiresAt) { setHoldRemainingMs(0); return; }
    const update = () => setHoldRemainingMs(computeHoldRemaining(draft.holdExpiresAt));
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [draft.holdExpiresAt]);

  const holdActive = useMemo(() => holdRemainingMs > 0, [holdRemainingMs]);

  const releaseHoldIfAny = useCallback(async () => {
    if (!draft.holdId) return;
    try { await apiDelete(`/holds/${draft.holdId}`); } catch { /* ignore */ }
    updateDraft({ holdId: undefined, holdExpiresAt: undefined });
  }, [draft.holdId, updateDraft]);

  return { holdRemainingMs, holdActive, releaseHoldIfAny } as const;
}

export default useHoldManager;
// Manages the booking hold countdown and release.
