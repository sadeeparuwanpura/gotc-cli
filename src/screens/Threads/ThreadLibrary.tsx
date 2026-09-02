import { useQuery } from '@tanstack/react-query';
import { fetchThreads } from '../../api/endpoints';
import { queryKeys } from '../../api/queryKeys';
import { usePermission } from '../../auth/usePermission';
import { DataTable, EmptyRow, SkeletonRows, tableStyles } from '../../components/DataTable';
import { ErrorNotice } from '../../components/Notice';
import { Num } from '../../components/Num';
import { FootNote, Screen, ScreenHeader } from '../../components/Screen';

const COLUMNS = 7;

export function ThreadLibrary(): JSX.Element {
  const master = usePermission('master');
  const threads = useQuery({
    queryKey: queryKeys.threads(),
    queryFn: ({ signal }) => fetchThreads(undefined, signal)
  });

  const rows = threads.data ?? [];

  return (
    <Screen>
      <ScreenHeader
        title="Thread library"
        subline="Ticket number is inverse weight — a higher ticket is a finer thread"
      />

      <ErrorNotice error={threads.error} />

      <DataTable hoverRows>
        <thead>
          <tr>
            <th>Brand</th>
            <th className={tableStyles.right}>Ticket</th>
            <th>Composition</th>
            <th>Colour</th>
            <th className={tableStyles.right}>Cone yield m</th>
            <th className={tableStyles.right}>Unit price</th>
            <th>Usage</th>
          </tr>
        </thead>
        <tbody>
          {threads.isLoading ? <SkeletonRows rows={3} columns={COLUMNS} /> : null}

          {!threads.isLoading && rows.length === 0 ? (
            <EmptyRow columns={COLUMNS}>No threads in the library yet.</EmptyRow>
          ) : null}

          {rows.map((thread) => (
            <tr key={thread.id}>
              <td className={tableStyles.strong}>{thread.brand}</td>
              <td className={`${tableStyles.right} ${tableStyles.mono} ${tableStyles.strong}`}>
                <Num value={thread.ticket} />
              </td>
              <td>{thread.composition}</td>
              <td>{thread.colour}</td>
              <td className={`${tableStyles.right} ${tableStyles.mono}`}>
                <Num value={thread.coneYieldM} />
              </td>
              <td className={`${tableStyles.right} ${tableStyles.mono}`}>
                ${thread.unitPrice.toFixed(2)}
              </td>
              <td className={tableStyles.soft}>
                {thread.usage.styles === 0 ? (
                  'not used'
                ) : (
                  <>
                    <Num value={thread.usage.styles} /> styles
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </DataTable>

      <FootNote>
        {master.can ? '' : `${master.hint}. `}New threads are created inline from any thread position
        on an operation.
      </FootNote>
    </Screen>
  );
}
