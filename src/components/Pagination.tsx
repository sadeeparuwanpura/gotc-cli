import styles from './Pagination.module.css';

export const PAGE_SIZES = [25, 50, 100] as const;
export const DEFAULT_PAGE_SIZE = 25;

interface PaginationProps {
  page: number;
  limit: number;
  /** Rows matching the filter, before paging. */
  total: number;
  /** What the rows are, for the range sentence: "orders", "styles". */
  noun: string;
  onPage: (page: number) => void;
  onLimit: (limit: number) => void;
}

/**
 * Page-based paging, server-side. Sits under a table and stays out of the way when the
 * whole set fits on one page — a four-style library should not grow a control bar.
 */
export function Pagination({
  page,
  limit,
  total,
  noun,
  onPage,
  onLimit
}: PaginationProps): JSX.Element | null {
  if (total <= PAGE_SIZES[0] && total <= limit) {
    return null;
  }

  const pageCount = Math.max(1, Math.ceil(total / limit));
  const first = total === 0 ? 0 : (page - 1) * limit + 1;
  const last = Math.min(page * limit, total);

  return (
    <div className={styles.bar}>
      <span className={styles.range}>
        Showing <span className={styles.figure}>{first}</span>–
        <span className={styles.figure}>{last}</span> of{' '}
        <span className={styles.figure}>{total}</span> {noun}
      </span>

      <div className={styles.controls}>
        <button
          type="button"
          className={styles.step}
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
        >
          <span className={styles.glyph}>‹</span> Previous
        </button>

        <span className={styles.page}>
          Page <span className={styles.figure}>{page}</span> of{' '}
          <span className={styles.figure}>{pageCount}</span>
        </span>

        <button
          type="button"
          className={styles.step}
          disabled={page >= pageCount}
          onClick={() => onPage(page + 1)}
        >
          Next <span className={styles.glyph}>›</span>
        </button>

        <label className={styles.sizeLabel}>
          Rows
          <select
            className={styles.sizeSelect}
            value={limit}
            aria-label="Rows per page"
            onChange={(event) => onLimit(Number(event.target.value))}
          >
            {PAGE_SIZES.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}
