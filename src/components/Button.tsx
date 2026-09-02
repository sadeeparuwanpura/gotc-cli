import type { ButtonHTMLAttributes, ReactNode } from 'react';
import styles from './Button.module.css';

export type ButtonVariant = 'ink' | 'outline' | 'quiet' | 'invert' | 'ok' | 'danger';

interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className'> {
  variant?: ButtonVariant;
  full?: boolean;
  children: ReactNode;
}

/**
 * Permission-locked controls are disabled, **not hidden**, and carry the explanatory
 * `title` from the permission matrix plus `aria-disabled` — pass both from usePermission.
 */
export function Button({
  variant = 'quiet',
  full = false,
  type = 'button',
  disabled,
  children,
  ...rest
}: ButtonProps): JSX.Element {
  const classes = [styles.base, styles[variant], full ? styles.full : ''].filter(Boolean).join(' ');

  return (
    <button
      {...rest}
      type={type}
      className={classes}
      disabled={disabled}
      aria-disabled={disabled ? true : undefined}
    >
      {children}
    </button>
  );
}
