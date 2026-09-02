import type { GarmentStatus, OrderStatus } from '../api/types';
import styles from './StatusPill.module.css';

const ORDER_STATUS_COLOUR: Record<OrderStatus, string> = {
  Draft: 'var(--status-draft)',
  'Pending approval': 'var(--status-pending)',
  Approved: 'var(--status-approved)',
  Ordered: 'var(--status-ordered)',
  Rejected: 'var(--status-rejected)'
};

export function orderStatusColour(status: OrderStatus): string {
  return ORDER_STATUS_COLOUR[status];
}

export function GarmentStatusPill({ status }: { status: GarmentStatus }): JSX.Element {
  return <span className={styles.garment}>{status}</span>;
}

export function OrderStatusPill({ status }: { status: OrderStatus }): JSX.Element {
  return (
    <span className={styles.order} style={{ color: ORDER_STATUS_COLOUR[status] }}>
      <span className={styles.dot} />
      {status}
    </span>
  );
}
