import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Fragment, useEffect, useState } from 'react';
import { ApiError } from '../../api/client';
import { updateGarment, updateThread } from '../../api/endpoints';
import { queryKeys } from '../../api/queryKeys';
import { usePermission, type PermissionGate } from '../../auth/usePermission';
import { CommitNumberInput } from '../../components/Field';
import { Num } from '../../components/Num';
import { SectionHead } from '../../components/Screen';
import { coneWorking, zeroPad } from '../../lib/format';
import { useDebouncedCallback } from '../../lib/useDebouncedCallback';
import type { CalculationDTO, GarmentDTO } from '../../api/types';
import styles from './ThreadRequirement.module.css';

interface ThreadRequirementProps {
  garment: GarmentDTO;
  calculation: CalculationDTO;
  infoGate: PermissionGate;
  onError: (message: string) => void;
}

export function ThreadRequirement({
  garment,
  calculation,
  infoGate,
  onError
}: ThreadRequirementProps): JSX.Element {
  const queryClient = useQueryClient();
  const master = usePermission('master');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // The assumptions bar writes back to the garment.
  const [quantity, setQuantity] = useState(String(garment.orderQuantity));
  const [wastage, setWastage] = useState(String(garment.wastagePercent));

  useEffect(() => setQuantity(String(garment.orderQuantity)), [garment.orderQuantity]);
  useEffect(() => setWastage(String(garment.wastagePercent)), [garment.wastagePercent]);

  function invalidate(): void {
    void queryClient.invalidateQueries({ queryKey: queryKeys.garment(garment.id) });
    void queryClient.invalidateQueries({ queryKey: queryKeys.garmentCalculation(garment.id) });
    void queryClient.invalidateQueries({ queryKey: queryKeys.allGarments });
  }

  const saveGarment = useMutation({
    mutationFn: (patch: { orderQuantity?: number; wastagePercent?: number }) =>
      updateGarment(garment.id, patch),
    onSuccess: invalidate,
    onError: (caught: unknown) =>
      onError(caught instanceof ApiError ? caught.message : 'The assumptions could not be saved.')
  });

  const saveYield = useMutation({
    mutationFn: (input: { threadId: string; coneYieldM: number }) =>
      updateThread(input.threadId, { coneYieldM: input.coneYieldM }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.allThreads });
      invalidate();
    },
    onError: (caught: unknown) =>
      onError(caught instanceof ApiError ? caught.message : 'The cone yield could not be saved.')
  });

  const pushQuantity = useDebouncedCallback((value: number) =>
    saveGarment.mutate({ orderQuantity: value })
  );
  const pushWastage = useDebouncedCallback((value: number) =>
    saveGarment.mutate({ wastagePercent: value })
  );

  function toggle(threadId: string): void {
    const next = new Set(expanded);
    if (next.has(threadId)) next.delete(threadId);
    else next.add(threadId);
    setExpanded(next);
  }

  return (
    <section id="thread-requirement">
      <SectionHead
        title={
          <>
            Thread requirement <span className="mono">{calculation.threadCount}</span>
          </>
        }
        hint={infoGate.can ? undefined : infoGate.hint}
      />

      <div className={styles.assumptions}>
        <span className={styles.assumptionsLabel}>Assumptions</span>

        <label className={styles.assumptionField}>
          <span className={styles.assumptionLabel}>Order quantity</span>
          <input
            className={styles.assumptionInput}
            inputMode="numeric"
            value={quantity}
            disabled={!infoGate.can}
            {...(infoGate.can ? {} : { title: infoGate.hint })}
            onChange={(event) => {
              setQuantity(event.target.value);
              const parsed = Number(event.target.value);
              if (Number.isInteger(parsed) && parsed >= 1) pushQuantity(parsed);
            }}
          />
        </label>

        <label className={styles.assumptionField}>
          <span className={styles.assumptionLabel}>Wastage %</span>
          <input
            className={styles.assumptionInput}
            inputMode="decimal"
            value={wastage}
            disabled={!infoGate.can}
            {...(infoGate.can ? {} : { title: infoGate.hint })}
            onChange={(event) => {
              setWastage(event.target.value);
              const parsed = Number(event.target.value);
              if (Number.isFinite(parsed) && parsed >= 0 && parsed <= 40) pushWastage(parsed);
            }}
          />
        </label>

        <span className={styles.assumptionNote}>Cone yield is per thread, in the table below.</span>
      </div>

      <div className="scrollX">
        <table className={styles.table}>
        <thead>
          <tr>
            <th>Thread</th>
            <th className={styles.right}>Ticket</th>
            <th className={styles.right}>m / garment</th>
            <th className={styles.right}>m / order</th>
            <th className={styles.right}>+ wastage</th>
            <th className={styles.right}>Cone yield m</th>
            <th className={styles.right}>Cones</th>
          </tr>
        </thead>
        <tbody>
          {calculation.threads.map((thread) => (
            <Fragment key={thread.threadId}>
              <tr>
                <td>
                  <div className={styles.threadCell}>
                    <button
                      type="button"
                      className={styles.expander}
                      aria-expanded={expanded.has(thread.threadId)}
                      aria-label={`Consumers of ${thread.ticket} ${thread.brand}`}
                      onClick={() => toggle(thread.threadId)}
                    >
                      {expanded.has(thread.threadId) ? '▲' : '▼'}
                    </button>
                    <span className={styles.brand}>{thread.brand}</span>
                    <span className={styles.threadMeta}>
                      {thread.composition} · {thread.colour}
                    </span>
                  </div>
                </td>
                <td className={`${styles.right} mono`} style={{ fontWeight: 500 }}>
                  {thread.ticket}
                </td>
                <td className={`${styles.right} mono`}>
                  <Num value={thread.metresPerGarment} decimals={2} flash />
                </td>
                <td className={`${styles.right} mono`}>
                  <Num value={thread.metresOrder} flash />
                </td>
                <td className={`${styles.right} mono`}>
                  <Num value={thread.metresWithWastage} flash />
                </td>
                <td>
                  <div className={styles.yieldCell}>
                    <CommitNumberInput
                      className={styles.yieldInput}
                      value={thread.coneYieldM}
                      decimals={0}
                      ariaLabel={`Cone yield for ${thread.ticket} ${thread.brand}`}
                      disabled={!master.can}
                      {...(master.can ? {} : { title: master.hint })}
                      onCommit={(coneYieldM) =>
                        saveYield.mutate({ threadId: thread.threadId, coneYieldM })
                      }
                    />
                  </div>
                </td>
                <td className={styles.right}>
                  <span className={styles.cones}>
                    <Num value={thread.cones} flash />
                  </span>
                </td>
              </tr>

              <tr className={styles.workingRow}>
                <td colSpan={7}>
                  {coneWorking(
                    thread.metresWithWastage,
                    thread.coneYieldM,
                    thread.rawCones,
                    thread.cones
                  )}
                </td>
              </tr>

              {expanded.has(thread.threadId) ? (
                <tr className={styles.consumerRow}>
                  <td colSpan={7}>
                    <div className={styles.consumers}>
                      {thread.consumers.map((consumer, index) => (
                        <div
                          key={`${consumer.operationId}-${consumer.position}-${index}`}
                          className={styles.consumer}
                        >
                          <span className={styles.consumerName}>
                            <span className="mono">{zeroPad(consumer.sequence)}</span>{' '}
                            {consumer.operationName}{' '}
                            <span className={styles.consumerPosition}>· {consumer.position}</span>
                          </span>
                          <span className="mono">
                            <Num value={consumer.metres} decimals={2} />
                          </span>
                        </div>
                      ))}
                    </div>
                  </td>
                </tr>
              ) : null}
            </Fragment>
          ))}

          <tr className={styles.totalRow}>
            <td className={styles.totalLabel}>Order total</td>
            <td />
            <td />
            <td />
            <td className={`${styles.right} mono`}>
              <Num value={calculation.totalMetres} flash />
            </td>
            <td className={`${styles.right} ${styles.totalUnit}`}>cones</td>
            <td className={styles.right}>
              <span className={styles.cones}>
                <Num value={calculation.totalCones} flash />
              </span>
            </td>
          </tr>
        </tbody>
        </table>
      </div>
    </section>
  );
}
