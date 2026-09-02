import { useEffect, useState, type ReactNode } from 'react';
import styles from './Field.module.css';

export { styles as fieldStyles };

interface FieldProps {
  label: string;
  htmlFor?: string;
  hint?: ReactNode;
  error?: string;
  children: ReactNode;
}

export function Field({ label, htmlFor, hint, error, children }: FieldProps): JSX.Element {
  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {hint ? <span className={styles.hint}>{hint}</span> : null}
      {error ? <span className={styles.fieldError}>{error}</span> : null}
    </div>
  );
}

export function FormPanel({
  title,
  error,
  actions,
  children
}: {
  title: string;
  error?: string;
  actions: ReactNode;
  children: ReactNode;
}): JSX.Element {
  return (
    <div className={styles.panel}>
      <div className={styles.panelHead}>{title}</div>
      <div className={styles.panelBody}>
        {children}
        {error ? (
          <div className={styles.errorBox} role="alert">
            {error}
          </div>
        ) : null}
      </div>
      <div className={styles.panelActions}>{actions}</div>
    </div>
  );
}

interface CommitInputProps {
  value: number;
  decimals?: number;
  disabled?: boolean;
  title?: string;
  ariaLabel: string;
  className?: string;
  onCommit: (value: number) => void;
}

/**
 * A numeric input that reports on blur or Enter, not on every keystroke — the inline
 * consumption-ratio and cone-yield edits write straight through to master data.
 */
export function CommitNumberInput({
  value,
  decimals = 1,
  disabled = false,
  title,
  ariaLabel,
  className,
  onCommit
}: CommitInputProps): JSX.Element {
  const [draft, setDraft] = useState(String(value));

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  function commit(): void {
    const parsed = Number(draft);
    if (!Number.isFinite(parsed) || parsed === value) {
      setDraft(String(value));
      return;
    }
    onCommit(Number(parsed.toFixed(decimals)));
  }

  return (
    <input
      className={`${styles.input} ${styles.mono} ${styles.right} ${className ?? ''}`}
      value={draft}
      disabled={disabled}
      title={title}
      aria-label={ariaLabel}
      aria-disabled={disabled ? true : undefined}
      inputMode="decimal"
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.currentTarget.blur();
        }
        if (event.key === 'Escape') {
          setDraft(String(value));
        }
      }}
    />
  );
}
