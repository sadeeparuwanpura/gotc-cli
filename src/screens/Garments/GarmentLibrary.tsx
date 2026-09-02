import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchGarments } from '../../api/endpoints';
import { queryKeys } from '../../api/queryKeys';
import { usePermission } from '../../auth/usePermission';
import { Button } from '../../components/Button';
import { DataTable, EmptyRow, SkeletonRows, tableStyles } from '../../components/DataTable';
import { MachineTokenRow } from '../../components/MachineToken';
import { ErrorNotice, Notice } from '../../components/Notice';
import { Num } from '../../components/Num';
import { DEFAULT_PAGE_SIZE, Pagination } from '../../components/Pagination';
import { FootNote, Screen, ScreenHeader } from '../../components/Screen';
import { GarmentStatusPill } from '../../components/StatusPill';
import { useRouteNotice } from '../../lib/notice';
import styles from './GarmentLibrary.module.css';

const COLUMNS = 10;

export function GarmentLibrary(): JSX.Element {
  const navigate = useNavigate();
  const notice = useRouteNotice();
  const info = usePermission('info');

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState<number>(DEFAULT_PAGE_SIZE);
  const [search, setSearch] = useState('');

  const garments = useQuery({
    queryKey: queryKeys.garments(page, search, limit),
    queryFn: ({ signal }) => fetchGarments({ page, limit, q: search }, signal),
    // Paging and searching change the key; keep the rows rather than flashing skeletons.
    placeholderData: keepPreviousData
  });

  const rows = garments.data?.items ?? [];
  const total = garments.data?.total ?? 0;
  const showSkeleton = garments.isLoading && garments.data === undefined;

  /** Any filter change starts again at page one. */
  function refilter(next: string): void {
    setSearch(next);
    setPage(1);
  }

  return (
    <Screen>
      <ScreenHeader
        title="Garments"
        subline={
          showSkeleton ? (
            ' '
          ) : (
            <>
              <Num value={total} /> styles · <Num value={garments.data?.operationTotal ?? 0} />{' '}
              operations on record
            </>
          )
        }
        actions={
          <Button variant="ink" onClick={() => navigate('/garments/new')} {...info.lock}>
            + New garment
          </Button>
        }
      />

      {notice ? <Notice variant={notice.variant}>{notice.message}</Notice> : null}
      <ErrorNotice error={garments.error} />

      <div className={styles.filterBar}>
        <input
          className={styles.searchInput}
          placeholder="Search style, garment or buyer"
          aria-label="Search style, garment or buyer"
          value={search}
          onChange={(event) => refilter(event.target.value)}
        />
      </div>

      <DataTable hoverRows clickRows rowHeight="library" attached>
        <thead>
          <tr>
            <th>Style</th>
            <th>Garment</th>
            <th>Buyer</th>
            <th>Season</th>
            <th className={tableStyles.right}>Order qty</th>
            <th className={tableStyles.right}>Ops</th>
            <th>Machines</th>
            <th className={tableStyles.right}>Cones</th>
            <th className={tableStyles.right}>Orders</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {showSkeleton ? <SkeletonRows rows={4} columns={COLUMNS} /> : null}

          {!showSkeleton && rows.length === 0 ? (
            <EmptyRow columns={COLUMNS}>
              {search ? 'No styles match this search.' : 'No styles on record yet.'}
            </EmptyRow>
          ) : null}

          {rows.map((garment) => (
            <tr key={garment.id} onClick={() => navigate(`/garments/${garment.id}`)}>
              <td className={`${tableStyles.mono} ${tableStyles.strong}`}>{garment.styleNumber}</td>
              <td>
                <span className={tableStyles.strong}>{garment.name}</span>{' '}
                <span className={tableStyles.soft}>· {garment.garmentType}</span>
              </td>
              <td>{garment.buyer}</td>
              <td>{garment.season}</td>
              <td className={`${tableStyles.right} ${tableStyles.mono}`}>
                <Num value={garment.orderQuantity} />
              </td>
              <td className={`${tableStyles.right} ${tableStyles.mono}`}>
                <Num value={garment.operationCount} />
              </td>
              <td>
                <MachineTokenRow machines={garment.machineTypesUsed} />
              </td>
              <td className={`${tableStyles.right} ${tableStyles.mono} ${tableStyles.strong}`}>
                <Num value={garment.totalCones} />
              </td>
              <td className={`${tableStyles.right} ${tableStyles.mono}`}>
                {garment.orderCount === 0 ? '—' : <Num value={garment.orderCount} />}
              </td>
              <td>
                <GarmentStatusPill status={garment.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </DataTable>

      <Pagination
        page={page}
        limit={limit}
        total={total}
        noun="styles"
        onPage={setPage}
        onLimit={(next) => {
          setLimit(next);
          setPage(1);
        }}
      />

      <FootNote>Select a style to open its detail view.</FootNote>
    </Screen>
  );
}
