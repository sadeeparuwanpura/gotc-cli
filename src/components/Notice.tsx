import type { ReactNode } from 'react';
import { ApiError } from '../api/client';
import styles from './Notice.module.css';

interface NoticeProps {
  variant: 'success' | 'warning';
  children: ReactNode;
}

/** The notice strip. Copy comes from the API or the spec — never reworded here. */
export function Notice({ variant, children }: NoticeProps): JSX.Element {
  return (
    <div className={`${styles.notice} ${styles[variant]}`} role="status">
      {children}
    </div>
  );
}

/**
 * Surfaces a failed read. Without it a dropped request leaves the previous rows on
 * screen with nothing to say they are stale.
 */
export function ErrorNotice({ error }: { error: unknown }): JSX.Element | null {
  if (!error) return null;
  return (
    <Notice variant="warning">
      {error instanceof ApiError ? error.message : 'That list could not be loaded.'}
    </Notice>
  );
}

export interface BlockedOperation {
  id: string;
  sequence: number;
  name: string;
}

interface BlockedBannerProps {
  operations: BlockedOperation[];
  onJump: (operationId: string) => void;
  onBreakdown: () => void;
}

/**
 * Shown only after a blocked attempt to create an order. Each link expands that
 * operation's thread panel.
 */
export function BlockedBanner({
  operations,
  onJump,
  onBreakdown
}: BlockedBannerProps): JSX.Element {
  return (
    <div className={`${styles.notice} ${styles.blocked}`} role="alert">
      <span className={styles.tag}>BLOCKED</span>
      <div className={styles.blockedBody}>
        <div>
          A cone order needs a thread at every position.{' '}
          <span className={styles.count}>{operations.length}</span> operation(s) have unassigned
          positions:{' '}
          {operations.map((operation, index) => (
            <span key={operation.id}>
              <button type="button" className={styles.link} onClick={() => onJump(operation.id)}>
                <span className="mono">{String(operation.sequence).padStart(2, '0')}</span>{' '}
                {operation.name}
              </button>
              {index < operations.length - 1 ? <span className={styles.separator}>, </span> : null}
            </span>
          ))}
        </div>
        <div className={styles.aside}>
          The operation breakdown sheet does not need thread data —{' '}
          <button type="button" className={styles.link} onClick={onBreakdown}>
            generate that instead
          </button>
          .
        </div>
      </div>
    </div>
  );
}
