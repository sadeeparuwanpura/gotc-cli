import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ApiError } from '../../api/client';
import { approveOrder, fetchOrder, placeOrder, rejectOrder } from '../../api/endpoints';
import { queryKeys } from '../../api/queryKeys';
import { usePermission } from '../../auth/usePermission';
import { Button } from '../../components/Button';
import { Notice } from '../../components/Notice';
import { Sheet, SheetFooter, sheetStyles } from '../../components/Sheet/Sheet';
import { OrderStatusPill } from '../../components/StatusPill';
import { formatDate, formatDateUpper, formatNumber, zeroPad } from '../../lib/format';
import { useRouteNotice } from '../../lib/notice';
import sheetDesk from '../../components/Sheet/Sheet.module.css';
import styles from './OrderDetail.module.css';

export function OrderDetail(): JSX.Element {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const routeNotice = useRouteNotice();
  const approveGate = usePermission('approve');
  const [error, setError] = useState('');

  const order = useQuery({
    queryKey: queryKeys.order(id),
    queryFn: ({ signal }) => fetchOrder(id, signal),
    enabled: id !== ''
  });

  function afterTransition(): void {
    void queryClient.invalidateQueries({ queryKey: queryKeys.order(id) });
    void queryClient.invalidateQueries({ queryKey: queryKeys.allOrders });
  }

  function reportFailure(caught: unknown, fallback: string): void {
    setError(caught instanceof ApiError ? caught.message : fallback);
  }

  const approve = useMutation({
    mutationFn: () => approveOrder(id),
    onSuccess: afterTransition,
    onError: (caught) => reportFailure(caught, 'The order could not be approved.')
  });
  const reject = useMutation({
    mutationFn: () => rejectOrder(id),
    onSuccess: afterTransition,
    onError: (caught) => reportFailure(caught, 'The order could not be rejected.')
  });
  const place = useMutation({
    mutationFn: () => placeOrder(id),
    onSuccess: afterTransition,
    onError: (caught) => reportFailure(caught, 'The order could not be marked as ordered.')
  });

  if (!order.data) {
    return <div />;
  }

  const record = order.data;
  const decidable = record.status === 'Draft' || record.status === 'Pending approval';

  const approvalLine =
    record.status === 'Approved' || record.status === 'Ordered'
      ? `Approved by ${record.approvedByName ?? '—'} · ${formatDate(record.approvedAt)}`
      : record.status === 'Rejected'
        ? `Rejected by ${record.approvedByName ?? '—'} · ${formatDate(record.approvedAt)}`
        : record.status === 'Pending approval'
          ? 'Awaiting approval'
          : 'Not submitted';

  const stamp =
    record.status === 'Approved' || record.status === 'Ordered'
      ? `APPROVED BY ${(record.approvedByName ?? '').toUpperCase()} ${formatDateUpper(record.approvedAt)}`
      : 'UNAPPROVED';

  // One THREAD VARIETY column per position slot, widest row wins.
  const varietyColumns = Array.from({ length: record.maxCells }, (_, index) => index);

  return (
    <>
      <div className={styles.chrome} data-print="hide">
        <div className={styles.chromeTop}>
          <div>
            <div className={styles.identity}>
              <span className={styles.code}>{record.code}</span>
              <span className={styles.garmentName}>{record.garmentName}</span>
              <span className={styles.styleNumber}>{record.styleNumber}</span>
              <OrderStatusPill status={record.status} />
            </div>
            <div className={styles.meta}>
              <span className={styles.metaItem}>{record.buyer}</span>
              <span className={styles.metaItem}>
                Qty <span className={styles.metaFigure}>{formatNumber(record.quantity)}</span> pcs
              </span>
              <span className={styles.metaItem}>
                Wastage <span className={styles.metaFigure}>{record.wastagePercent}%</span>
              </span>
              <span className={styles.metaItem}>
                Created by {record.createdByName} · {formatDate(record.createdAt)}
              </span>
              <span className={styles.metaItem}>{approvalLine}</span>
            </div>
          </div>

          <div className={styles.actions}>
            <Button onClick={() => navigate('/orders')}>All orders</Button>
            <Button onClick={() => navigate(`/garments/${record.garmentId}`)}>Open garment</Button>

            {decidable ? (
              <>
                <Button
                  variant="danger"
                  onClick={() => reject.mutate()}
                  disabled={!approveGate.can || reject.isPending}
                  {...(approveGate.can ? {} : { title: approveGate.hint })}
                >
                  Reject
                </Button>
                <Button
                  variant="ok"
                  onClick={() => approve.mutate()}
                  disabled={!approveGate.can || approve.isPending}
                  {...(approveGate.can ? {} : { title: approveGate.hint })}
                >
                  Approve order
                </Button>
              </>
            ) : null}

            {record.status === 'Approved' ? (
              <Button
                variant="ink"
                onClick={() => place.mutate()}
                disabled={!approveGate.can || place.isPending}
                {...(approveGate.can ? {} : { title: approveGate.hint })}
              >
                Mark as ordered
              </Button>
            ) : null}

            <Button variant="outline" onClick={() => window.print()}>
              Print
            </Button>
          </div>
        </div>

        {record.note ? <div className={styles.noteStrip}>{record.note}</div> : null}
      </div>

      <div className={sheetDesk.desk}>
        {routeNotice ? <Notice variant={routeNotice.variant}>{routeNotice.message}</Notice> : null}
        {error ? <Notice variant="warning">{error}</Notice> : null}

        <Sheet>
          <div className={sheetStyles.head}>
            <div>
              <div className={sheetStyles.title}>
                {record.garmentName.toUpperCase()} — THREAD ORDER
              </div>
              <div className={sheetStyles.subtitle}>
                Order {record.code} · Style {record.styleNumber} · Buyer {record.buyer} · Quantity{' '}
                {formatNumber(record.quantity)} pcs
              </div>
            </div>
            <div className={sheetStyles.headRight}>
              <div>For project managers</div>
              <div className={sheetStyles.headMono}>
                WASTAGE {record.wastagePercent}% · {formatNumber(record.totalCones)} CONES
              </div>
              <div className={sheetStyles.stamp}>{stamp}</div>
            </div>
          </div>

          <table className={`${sheetStyles.table} ${sheetStyles.dense}`}>
            <thead>
              <tr>
                <th style={{ width: '44px' }}>#</th>
                <th>ACTION</th>
                <th style={{ width: '190px' }}>MACHINE TYPE</th>
                {varietyColumns.map((index) => (
                  <th key={index} style={{ width: '190px' }}>
                    THREAD VARIETY
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {record.rows.map((row) => (
                <tr key={row.sequence}>
                  <td className={`${sheetStyles.mono} ${sheetStyles.strong}`}>
                    {zeroPad(row.sequence)}
                  </td>
                  <td>{row.name}</td>
                  <td>{row.machineName}</td>
                  {varietyColumns.map((index) => (
                    <td key={index} className={sheetStyles.mono}>
                      {row.cells[index] ?? ''}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>

          <div className={sheetStyles.summaryRule}>
            <div className={sheetStyles.summaryLabel}>PURCHASE SUMMARY</div>
            <table className={`${sheetStyles.table} ${sheetStyles.dense}`}>
              <thead>
                <tr>
                  <th>THREAD</th>
                  <th style={{ width: '90px' }}>TICKET</th>
                  <th>COMPOSITION</th>
                  <th style={{ width: '110px' }}>COLOUR</th>
                  <th style={{ width: '150px' }} className={sheetStyles.right}>
                    TOTAL METRES
                  </th>
                  <th style={{ width: '90px' }} className={sheetStyles.right}>
                    CONES
                  </th>
                </tr>
              </thead>
              <tbody>
                {record.lines.map((line) => (
                  <tr key={line.threadId}>
                    <td className={sheetStyles.strong}>{line.brand.toUpperCase()}</td>
                    <td className={sheetStyles.mono}>{line.ticket}</td>
                    <td>{line.composition}</td>
                    <td>{line.colour}</td>
                    <td className={`${sheetStyles.right} ${sheetStyles.mono}`}>
                      {formatNumber(line.metresWithWastage)}
                    </td>
                    <td className={`${sheetStyles.right} ${sheetStyles.mono} ${sheetStyles.strong}`}>
                      {formatNumber(line.cones)}
                    </td>
                  </tr>
                ))}
                <tr className={sheetStyles.totalRow}>
                  <td colSpan={4}>ORDER TOTAL</td>
                  <td className={`${sheetStyles.right} ${sheetStyles.mono}`}>
                    {formatNumber(record.totalMetres)}
                  </td>
                  <td className={`${sheetStyles.right} ${sheetStyles.mono}`}>
                    {formatNumber(record.totalCones)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <SheetFooter
            parts={[`${record.code} · ${record.styleNumber} · THREAD CONE ORDER`, stamp, 'PAGE 1 OF 1']}
          />
        </Sheet>
      </div>
    </>
  );
}
