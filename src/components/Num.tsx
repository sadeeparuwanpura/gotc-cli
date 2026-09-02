import { formatNumber } from '../lib/format';
import { useFlashOnChange } from '../lib/useFlashOnChange';

interface NumProps {
  value: number | null | undefined;
  decimals?: number;
  /** Pulse `--flash` when the figure changes — for anything the calculation derives. */
  flash?: boolean;
  className?: string;
  title?: string;
}

/**
 * Every number in GOTC is set in IBM Plex Mono — style numbers, tickets, metres, cone
 * counts, quantities, dates, sequences, ratios. This is the core typographic rule.
 */
export function Num({ value, decimals = 0, flash = false, className, title }: NumProps): JSX.Element {
  const pulse = useFlashOnChange(value, flash);
  const classes = ['mono', className, flash ? pulse.className : ''].filter(Boolean).join(' ');

  return (
    <span key={flash ? pulse.key : undefined} className={classes} title={title}>
      {formatNumber(value, decimals)}
    </span>
  );
}
