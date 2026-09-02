import type { ReactNode } from 'react';
import styles from './DataTable.module.css';

export { styles as tableStyles };

interface TableProps {
  children: ReactNode;
  /** Sits directly under a card header, so it drops its own top border. */
  attached?: boolean;
  hoverRows?: boolean;
  clickRows?: boolean;
  rowHeight?: 'library' | 'orders';
  className?: string;
}

export function DataTable({
  children,
  attached = false,
  hoverRows = false,
  clickRows = false,
  rowHeight,
  className
}: TableProps): JSX.Element {
  const classes = [
    styles.table,
    attached ? styles.attached : '',
    hoverRows ? styles.hoverRows : '',
    clickRows ? styles.clickRows : '',
    rowHeight === 'library' ? styles.rowsLibrary : '',
    rowHeight === 'orders' ? styles.rowsOrders : '',
    className
  ]
    .filter(Boolean)
    .join(' ');

  // Every table gets its own horizontal scroller: a wide one must never widen the page.
  return (
    <div className="scrollX">
      <table className={classes}>{children}</table>
    </div>
  );
}

/** A name over a mono date — "Created by" and "Approved by". */
export function NameOverDate({
  name,
  date,
  placeholder
}: {
  name: string | null;
  date: string | null;
  placeholder?: ReactNode;
}): JSX.Element {
  if (!name) {
    return <>{placeholder ?? '—'}</>;
  }
  return (
    <span className={styles.stack}>
      <span>{name}</span>
      {date ? <span className={styles.stackDate}>{date}</span> : null}
    </span>
  );
}

export function Chips({ items }: { items: string[] }): JSX.Element {
  return (
    <span className={styles.chips}>
      {items.map((item) => (
        <span key={item} className={styles.chip}>
          {item}
        </span>
      ))}
    </span>
  );
}

/** Hairline placeholder rows at the real row height. */
export function SkeletonRows({ rows, columns }: { rows: number; columns: number }): JSX.Element {
  return (
    <>
      {Array.from({ length: rows }, (_, rowIndex) => (
        <tr key={rowIndex}>
          {Array.from({ length: columns }, (_, columnIndex) => (
            <td key={columnIndex}>
              <div className={styles.skeleton} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export function EmptyRow({ columns, children }: { columns: number; children: ReactNode }): JSX.Element {
  return (
    <tr className={styles.emptyRow}>
      <td colSpan={columns}>{children}</td>
    </tr>
  );
}
