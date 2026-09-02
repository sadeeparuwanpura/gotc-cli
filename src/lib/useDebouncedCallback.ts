import { useCallback, useEffect, useRef } from 'react';

/**
 * Operation edits update local state on change and persist ~500ms later, so typing a seam
 * length does not fire a request per keystroke.
 */
export function useDebouncedCallback<TArgs extends unknown[]>(
  callback: (...args: TArgs) => void,
  delay = 500
): (...args: TArgs) => void {
  const latest = useRef(callback);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    latest.current = callback;
  }, [callback]);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );

  return useCallback(
    (...args: TArgs) => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => latest.current(...args), delay);
    },
    [delay]
  );
}
