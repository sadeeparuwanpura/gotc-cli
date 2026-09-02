import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ApiError } from '../../api/client';
import { fetchMachineTypes, updatePositionRatio } from '../../api/endpoints';
import { queryKeys } from '../../api/queryKeys';
import { usePermission } from '../../auth/usePermission';
import { DataTable, tableStyles } from '../../components/DataTable';
import { CommitNumberInput } from '../../components/Field';
import { Notice } from '../../components/Notice';
import { Num } from '../../components/Num';
import { FootNote, Screen, ScreenHeader } from '../../components/Screen';
import styles from './MachineTypes.module.css';

export function MachineTypes(): JSX.Element {
  const queryClient = useQueryClient();
  const master = usePermission('master');
  const [error, setError] = useState('');

  const machineTypes = useQuery({
    queryKey: queryKeys.machineTypes,
    queryFn: ({ signal }) => fetchMachineTypes(signal)
  });

  const saveRatio = useMutation({
    mutationFn: (input: { machineTypeId: string; positionId: string; consumptionRatio: number }) =>
      updatePositionRatio(input.machineTypeId, input.positionId, input.consumptionRatio),
    onSuccess: () => {
      setError('');
      void queryClient.invalidateQueries({ queryKey: queryKeys.allMachineTypes });
      // Any garment's cone count may have just moved.
      void queryClient.invalidateQueries({ queryKey: ['garmentCalculation'] });
      void queryClient.invalidateQueries({ queryKey: queryKeys.allGarments });
    },
    onError: (caught: unknown) => {
      setError(caught instanceof ApiError ? caught.message : 'The ratio could not be saved.');
    }
  });

  return (
    <Screen>
      <ScreenHeader
        title="Machine types"
        subline="The machine type defines the thread positions and consumption ratios"
      />

      {error ? <Notice variant="warning">{error}</Notice> : null}

      <div className={styles.grid}>
        {(machineTypes.data ?? []).map((machineType) => (
          <div key={machineType.id} className={styles.card}>
            <div
              className={styles.head}
              style={{ ['--machine-colour' as string]: machineType.colour }}
            >
              <span className={styles.name}>{machineType.name}</span>
              <span className={styles.code}>{machineType.code}</span>
              <span className={styles.threads}>
                <span className={styles.threadCount}>{machineType.totalThreads}</span> threads
              </span>
            </div>

            <DataTable attached>
              <thead>
                <tr>
                  <th>Position</th>
                  <th className={tableStyles.right}>Count</th>
                  <th className={tableStyles.right}>Consumption m/m</th>
                </tr>
              </thead>
              <tbody>
                {machineType.positions.map((position) => (
                  <tr key={position.id}>
                    <td className={tableStyles.mono}>{position.position}</td>
                    <td className={`${tableStyles.right} ${tableStyles.mono}`}>
                      <Num value={position.count} />
                    </td>
                    <td>
                      <div className={styles.ratioCell}>
                        <CommitNumberInput
                          className={styles.ratioInput}
                          value={position.consumptionRatio}
                          decimals={1}
                          ariaLabel={`${machineType.name} ${position.position} consumption ratio`}
                          disabled={!master.can}
                          {...(master.can ? {} : { title: master.hint })}
                          onCommit={(consumptionRatio) =>
                            saveRatio.mutate({
                              machineTypeId: machineType.id,
                              positionId: position.id,
                              consumptionRatio
                            })
                          }
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          </div>
        ))}
      </div>

      <FootNote>
        Changing a consumption ratio recalculates every operation on that machine type, on every
        garment.
      </FootNote>
    </Screen>
  );
}
