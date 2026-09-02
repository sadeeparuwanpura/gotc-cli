import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchOrders } from '../../api/endpoints';
import { queryKeys } from '../../api/queryKeys';
import { Button } from '../../components/Button';
import { DataTable, EmptyRow, NameOverDate, SkeletonRows, tableStyles } from '../../components/DataTable';
import { ErrorNotice, Notice } from '../../components/Notice';
import { Num } from '../../components/Num';
import { DEFAULT_PAGE_SIZE, Pagination } from '../../components/Pagination';
import { FootNote, Screen, ScreenHeader } from '../../components/Screen';
import { OrderStatusPill, orderStatusColour } from '../../components/StatusPill';
import { formatDate } from '../../lib/format';
import { useRouteNotice } from '../../lib/notice';
import { ORDER_STATUSES, type OrderStatus } from '../../api/types';
import styles from './OrderRegister.module.css';

const COLUMNS = 9;
type Filter = 'All' | OrderStatus;
const FILTERS: Filter[] = ['All', ...ORDER_STATUSES];

export function OrderRegister(): JSX.Element {
  const navigate = useNavigate();
  const notice = useRouteNotice();
  const [filter, setFilter] = useState<Filter>('All');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState<number>(DEFAULT_PAGE_SIZE);

  const orders = useQuery({
    queryKey: queryKeys.orders(filter, search, page),
    queryFn: ({ signal }) => fetchOrders({ status: filter, q: search, page, limit }, signal),
    // Filter and search change the key on every keystroke; keep the rows on screen rather
    // than flashing the whole table back to skeletons.
    placeholderData: keepPreviousData
  });

  const items = orders.data?.items ?? [];
  const counts = orders.data?.counts;
  const total = orders.data?.total ?? 0;
  // Skeletons are for the first load only, never for a refilter.
  const showSkeleton = orders.isLoading && orders.data === undefined;

  return (
    <Screen>
      <ScreenHeader
        title="Thread cone orders"
        subline="Every order created from a garment, with its approval record"
        actions={
          <>
            <Button
              onClick={() =>
                navigate(
                  `/orders/print?status=${encodeURIComponent(filter)}&q=${encodeURIComponent(search)}`
                )
              }
            >
              Print list view
            </Button>
            <Button variant="ink" onClick={() => navigate('/garments')}>
              New order from a garment
            </Button>
          </>
        }
      />

      {notice ? <Notice variant={notice.variant}>{notice.message}</Notice> : null}
      <ErrorNotice error={orders.error} />

      <div className={styles.filterBar}>
        <div className={styles.chips}>
          {FILTERS.map((option) => (
            <button
              key={option}
              type="button"
              className={`${styles.chip} ${filter === option ? styles.chipActive : ''}`}
              aria-pressed={filter === option}
              onClick={() => {
                setFilter(option);
                setPage(1);
              }}
            >
              {option !== 'All' ? (
                <span
                  className={styles.chipDot}
                  style={{ background: orderStatusColour(option) }}
                />
              ) : null}
              {option}
              <span className={styles.chipCount}>{counts?.[option] ?? 0}</span>
            </button>
          ))}
        </div>

        <div className={styles.search}>
          <input
            className={styles.searchInput}
            placeholder="Search order, style or buyer"
            aria-label="Search order, style or buyer"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
          <span className={styles.resultCount}>
            <span className={styles.resultFigure}>{total}</span> of{' '}
            <span className={styles.resultFigure}>{counts?.All ?? 0}</span> orders
          </span>
        </div>
      </div>

      <DataTable hoverRows clickRows rowHeight="orders" attached>
        <thead>
          <tr>
            <th>Order</th>
            <th>Style</th>
            <th>Garment</th>
            <th>Buyer</th>
            <th className={tableStyles.right}>Qty pcs</th>
            <th className={tableStyles.right}>Cones</th>
            <th>Created by</th>
            <th>Status</th>
            <th>Approved by</th>
          </tr>
        </thead>
        <tbody>
          {showSkeleton ? <SkeletonRows rows={5} columns={COLUMNS} /> : null}

          {!showSkeleton && items.length === 0 ? (
            <EmptyRow columns={COLUMNS}>No orders match this filter.</EmptyRow>
          ) : null}

          {items.map((order) => (
            <tr key={order.id} onClick={() => navigate(`/orders/${order.id}`)}>
              <td className={`${tableStyles.mono} ${tableStyles.strong}`}>{order.code}</td>
              <td className={tableStyles.mono}>{order.styleNumber}</td>
              <td>{order.garmentName}</td>
              <td>{order.buyer}</td>
              <td className={`${tableStyles.right} ${tableStyles.mono}`}>
                <Num value={order.quantity} />
              </td>
              <td className={`${tableStyles.right} ${tableStyles.mono} ${tableStyles.strong}`}>
                <Num value={order.totalCones} />
              </td>
              <td>
                <NameOverDate name={order.createdByName} date={formatDate(order.createdAt)} />
              </td>
              <td>
                <OrderStatusPill status={order.status} />
              </td>
              <td>
                <NameOverDate
                  name={order.approvedByName}
                  date={order.approvedAt ? formatDate(order.approvedAt) : null}
                  placeholder={
                    order.status === 'Pending approval' ? (
                      <span className={tableStyles.faint}>Awaiting approval</span>
                    ) : (
                      '—'
                    )
                  }
                />
              </td>
            </tr>
          ))}
        </tbody>
      </DataTable>

      <Pagination
        page={page}
        limit={limit}
        total={total}
        noun="orders"
        onPage={setPage}
        onLimit={(next) => {
          setLimit(next);
          setPage(1);
        }}
      />

      <FootNote>
        Select an order to see every operation, thread position and the purchase summary.
      </FootNote>
    </Screen>
  );
}
