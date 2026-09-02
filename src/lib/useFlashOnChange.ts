import { useEffect, useRef, useState } from 'react';

/**
 * Every derived figure pulses `--flash` for one frame whenever its inputs change.
 * The counter forces React to remount the node so the CSS animation restarts even when
 * the figure changes twice in quick succession.
 */
export function useFlashOnChange(value: unknown, enabled = true): { className: string; key: number } {
  const previous = useRef(value);
  const [pulse, setPulse] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    if (Object.is(previous.current, value)) return;
    previous.current = value;
    setPulse((count) => count + 1);
  }, [value, enabled]);

  return { className: pulse > 0 ? 'flash' : '', key: pulse };
}
