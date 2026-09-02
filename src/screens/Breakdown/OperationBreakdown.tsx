import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { fetchGarment, fetchOperations } from '../../api/endpoints';
import { queryKeys } from '../../api/queryKeys';
import { Sheet, SheetDesk, SheetFooter, sheetStyles } from '../../components/Sheet/Sheet';
import { formatDateUpper, zeroPad } from '../../lib/format';

/**
 * For sewing technicians on the floor. Deliberately needs no thread data, so it is
 * available even while thread assignment is incomplete.
 */
export function OperationBreakdown(): JSX.Element {
  const { id = '' } = useParams();
  const navigate = useNavigate();

  const garment = useQuery({
    queryKey: queryKeys.garment(id),
    queryFn: ({ signal }) => fetchGarment(id, signal),
    enabled: id !== ''
  });
  const operations = useQuery({
    queryKey: queryKeys.operations(id),
    queryFn: ({ signal }) => fetchOperations(id, signal),
    enabled: id !== ''
  });

  if (!garment.data) {
    return <div />;
  }

  const record = garment.data;
  const rows = operations.data ?? [];
  const machineCount = new Set(
    rows.map((operation) => operation.machineTypeId).filter(Boolean)
  ).size;
  const today = new Date().toISOString();

  return (
    <SheetDesk
      label={`Operation breakdown sheet · A4 landscape · ${record.styleNumber}`}
      backLabel="Back to garment"
      onBack={() => navigate(`/garments/${record.id}`)}
    >
      <Sheet>
        <div className={sheetStyles.head}>
          <div>
            <div className={sheetStyles.title}>
              {record.name.toUpperCase()} — OPERATION BREAKDOWN
            </div>
            <div className={sheetStyles.subtitle}>
              Style {record.styleNumber} · Buyer {record.buyer} · {record.garmentType}
            </div>
          </div>
          <div className={sheetStyles.headRight}>
            <div>For sewing technicians</div>
            <div className={sheetStyles.headMono}>
              {rows.length} operations · {machineCount} machine types
            </div>
          </div>
        </div>

        <table className={sheetStyles.table}>
          <thead>
            <tr>
              <th style={{ width: '56px' }}>#</th>
              <th>ACTION</th>
              <th style={{ width: '280px' }}>MACHINE TYPE</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((operation) => (
              <tr key={operation.id}>
                <td className={`${sheetStyles.mono} ${sheetStyles.strong}`}>
                  {zeroPad(operation.sequence)}
                </td>
                <td>{operation.name}</td>
                <td>{operation.machineTypeName ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <SheetFooter
          parts={[
            `${record.styleNumber} · OPERATION BREAKDOWN`,
            `GENERATED ${formatDateUpper(today)}`,
            'PAGE 1 OF 1'
          ]}
        />
      </Sheet>
    </SheetDesk>
  );
}
