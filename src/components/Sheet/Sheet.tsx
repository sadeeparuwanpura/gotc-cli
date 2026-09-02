import type { ReactNode } from 'react';
import { Button } from '../Button';
import styles from './Sheet.module.css';

export { styles as sheetStyles };

interface SheetDeskProps {
  label: string;
  onBack: () => void;
  backLabel: string;
  children: ReactNode;
}

/** Screen chrome above a printable page. Hidden when printing. */
export function SheetDesk({ label, onBack, backLabel, children }: SheetDeskProps): JSX.Element {
  return (
    <div className={styles.desk}>
      <div className={styles.chrome} data-print="hide">
        <span className={styles.chromeLabel}>{label}</span>
        <div className={styles.chromeActions}>
          <Button onClick={onBack}>{backLabel}</Button>
          <Button variant="ink" onClick={() => window.print()}>
            Print
          </Button>
        </div>
      </div>
      {children}
    </div>
  );
}

export function Sheet({ children }: { children: ReactNode }): JSX.Element {
  // A4 landscape at 96dpi is a fixed 1123px. On a narrower desk it scrolls in its own
  // box; on paper the wrapper and the fixed width both fall away.
  return (
    <div className={styles.sheetScroller}>
      <div className={styles.sheet}>{children}</div>
    </div>
  );
}

export function SheetFooter({ parts }: { parts: string[] }): JSX.Element {
  return (
    <div className={styles.footer}>
      {parts.map((part) => (
        <span key={part}>{part}</span>
      ))}
    </div>
  );
}
