import type { ReactNode } from 'react';
import styles from './Screen.module.css';

export function Screen({ children }: { children: ReactNode }): JSX.Element {
  return <div className={styles.screen}>{children}</div>;
}

export function ScreenHeader({
  title,
  subline,
  actions
}: {
  title: string;
  subline?: ReactNode;
  actions?: ReactNode;
}): JSX.Element {
  return (
    <div className={styles.header}>
      <div>
        <h1 className={styles.title}>{title}</h1>
        {subline ? <div className={styles.subline}>{subline}</div> : null}
      </div>
      {actions ? <div className={styles.actions}>{actions}</div> : null}
    </div>
  );
}

export function Card({
  children,
  className
}: {
  children: ReactNode;
  className?: string;
}): JSX.Element {
  return <div className={`${styles.card} ${className ?? ''}`}>{children}</div>;
}

export function CardHeader({ title, note }: { title: string; note?: ReactNode }): JSX.Element {
  return (
    <div className={styles.cardHeader}>
      <span>{title}</span>
      {note ? <span className={styles.cardHeaderNote}>{note}</span> : null}
    </div>
  );
}

export function CardBody({ children }: { children: ReactNode }): JSX.Element {
  return <div className={styles.cardBody}>{children}</div>;
}

export function SectionHead({
  title,
  hint,
  id
}: {
  title: ReactNode;
  hint?: ReactNode;
  id?: string;
}): JSX.Element {
  return (
    <div className={styles.sectionHead} id={id}>
      <h2 className={styles.sectionTitle}>{title}</h2>
      {hint ? <span className={styles.sectionHint}>{hint}</span> : null}
    </div>
  );
}

export function FootNote({ children }: { children: ReactNode }): JSX.Element {
  return <div className={styles.footNote}>{children}</div>;
}

export function EmptyState({
  title,
  body,
  action
}: {
  title: string;
  body: string;
  action?: ReactNode;
}): JSX.Element {
  return (
    <div className={styles.empty}>
      <div className={styles.emptyTitle}>{title}</div>
      <p className={styles.emptyBody}>{body}</p>
      {action}
    </div>
  );
}
