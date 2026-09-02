import { useQuery } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { fetchOrders } from '../../api/endpoints';
import { queryKeys } from '../../api/queryKeys';
import { Sheet, SheetDesk, SheetFooter, sheetStyles } from '../../components/Sheet/Sheet';
import { formatDate, formatDateUpper, formatNumber } from '../../lib/format';

/** Prints the register exactly as the screen currently filters it. */
export function OrderRegisterPrint(): JSX.Element {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const status = params.get('status') ?? 'All';
  const search = params.get('q') ?? '';

  const orders = useQuery({
    queryKey: queryKeys.orders(status, search),
    queryFn: ({ signal }) => fetchOrders({ status, q: search }, signal)
  });

  const items = orders.data?.items ?? [];
  const totals = orders.data?.totals;
  const total = orders.data?.counts.All ?? 0;

  const filterLine = [
    status === 'All' ? 'All statuses' : `Status: ${status}`,
    search ? `search "${search}"` : ''
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <SheetDesk
      label={`Order register · A4 landscape · ${items.length} of ${total} orders · ${status === 'All' ? 'All statuses' : status}`}
      backLabel="Back to orders"
      onBack={() => navigate('/orders')}
    >
      <Sheet>
        <div className={sheetStyles.head}>
          <div>
            <div className={sheetStyles.title}>THREAD CONE ORDER REGISTER</div>
            <div className={sheetStyles.subtitle}>{filterLine}</div>
          </div>
          <div className={sheetStyles.headRight}>
            <div className={sheetStyles.headMono}>
              {formatNumber(totals?.cones ?? 0)} CONES · {formatNumber(totals?.orders ?? 0)} ORDERS
            </div>
            <div className={sheetStyles.stamp}>{formatDateUpper(new Date().toISOString())}</div>
          </div>
        </div>

        <table className={`${sheetStyles.table} ${sheetStyles.dense}`}>
          <thead>
            <tr>
              <th>ORDER</th>
              <th>STYLE</th>
              <th>GARMENT</th>
              <th>BUYER</th>
              <th className={sheetStyles.right}>QTY</th>
              <th className={sheetStyles.right}>METRES</th>
              <th className={sheetStyles.right}>CONES</th>
              <th>CREATED BY</th>
              <th>STATUS</th>
              <th>APPROVED BY</th>
            </tr>
          </thead>
          <tbody>
            {items.map((order) => (
              <tr key={order.id}>
                <td className={`${sheetStyles.mono} ${sheetStyles.strong}`}>{order.code}</td>
                <td className={sheetStyles.mono}>{order.styleNumber}</td>
                <td>{order.garmentName}</td>
                <td>{order.buyer}</td>
                <td className={`${sheetStyles.right} ${sheetStyles.mono}`}>
                  {formatNumber(order.quantity)}
                </td>
                <td className={`${sheetStyles.right} ${sheetStyles.mono}`}>
                  {formatNumber(order.totalMetres)}
                </td>
                <td className={`${sheetStyles.right} ${sheetStyles.mono} ${sheetStyles.strong}`}>
                  {formatNumber(order.totalCones)}
                </td>
                <td>
                  {order.createdByName}
                  <div className={sheetStyles.mono} style={{ fontSize: '10.5px' }}>
                    {formatDate(order.createdAt)}
                  </div>
                </td>
                <td className={sheetStyles.strong}>{order.status.toUpperCase()}</td>
                <td>
                  {order.approvedByName ?? '—'}
                  {order.approvedAt ? (
                    <div className={sheetStyles.mono} style={{ fontSize: '10.5px' }}>
                      {formatDate(order.approvedAt)}
                    </div>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <SheetFooter
          parts={[
            'THREAD CONE ORDER REGISTER',
            `GENERATED ${formatDateUpper(new Date().toISOString())}`,
            'PAGE 1 OF 1'
          ]}
        />
      </Sheet>
    </SheetDesk>
  );
}
