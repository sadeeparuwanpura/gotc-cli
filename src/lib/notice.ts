import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export interface RouteNotice {
  variant: 'success' | 'warning';
  message: string;
}

interface NoticeState {
  notice?: RouteNotice;
}

/** Carries a one-shot notice across a navigation without a global store. */
export function noticeState(notice: RouteNotice): NoticeState {
  return { notice };
}

function readNotice(state: unknown): RouteNotice | null {
  if (typeof state !== 'object' || state === null) return null;
  const candidate = (state as NoticeState).notice;
  if (!candidate || typeof candidate.message !== 'string') return null;
  if (candidate.variant !== 'success' && candidate.variant !== 'warning') return null;
  return candidate;
}

/**
 * Reads the notice the previous screen handed over, then clears it from history so a
 * reload does not show it again.
 */
export function useRouteNotice(): RouteNotice | null {
  const location = useLocation();
  const navigate = useNavigate();
  const [notice] = useState(() => readNotice(location.state));

  useEffect(() => {
    if (readNotice(location.state)) {
      navigate(location.pathname + location.search, { replace: true, state: null });
    }
    // Runs once per arrival; the notice is captured in state above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return notice;
}
