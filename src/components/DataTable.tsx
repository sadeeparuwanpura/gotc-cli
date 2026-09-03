import { useLayoutEffect, useRef, type ReactNode } from 'react';
import styles from './DataTable.module.css';

export { styles as tableStyles };

/**
 * Copies each column's header text onto the cells beneath it as `data-label`.
 *
 * Below 700px a row stacks into a card and the header row is hidden, so every cell has to
 * carry its own label — `td::before { content: attr(data-label) }` prints it. Deriving the
 * labels from the table's own `<th>`s keeps one source of truth: a renamed column cannot
 * drift from its stacked label, and a table nobody has touched still works.
 *
 * A cell that sets its own `data-label` wins, and an actions cell under a blank `<th>` is
 * left unlabelled on purpose.
 */
function useColumnLabels(children: ReactNode): React.RefObject<HTMLTableElement> {
  const ref = useRef<HTMLTableElement>(null);

  useLayoutEffect(() => {
    const table = ref.current;
    if (!table) return;

    const headers = Array.from(table.querySelectorAll('thead th')).map((cell) =>
      (cell.textContent ?? '').trim()
    );
    if (headers.length === 0) return;

    for (const row of Array.from(table.querySelectorAll('tbody tr'))) {
      const cells = Array.from(row.children);
      // A cell spanning the row (an empty state) has no single column to name.
      if (cells.length !== headers.length) continue;

      cells.forEach((cell, index) => {
        const label = headers[index];
        if (!label) return;
        if (cell.getAttribute('data-label') === label) return;
        cell.setAttribute('data-label', label);
      });
    }
  }, [children]);

  return ref;
}

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

  const ref = useColumnLabels(children);

  // Every table gets its own horizontal scroller: a wide one must never widen the page.
  return (
    <div className="scrollX">
      <table ref={ref} className={classes}>
        {children}
      </table>
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
