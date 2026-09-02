import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, type DragEvent } from 'react';
import { ApiError } from '../../api/client';
import {
  createOperation,
  deleteOperation,
  reorderOperations,
  updateOperation,
  updateOperationThread
} from '../../api/endpoints';
import { queryKeys } from '../../api/queryKeys';
import type { PermissionGate } from '../../auth/usePermission';
import { Button } from '../../components/Button';
import { MachineLegend } from '../../components/MachineToken';
import { EmptyState, SectionHead } from '../../components/Screen';
import type { MachineTypeDTO, OperationDTO, ThreadDTO } from '../../api/types';
import { OperationRow } from './OperationRow';
import styles from './Operations.module.css';

interface OperationsSectionProps {
  garmentId: string;
  operations: OperationDTO[];
  machineTypes: MachineTypeDTO[];
  threads: ThreadDTO[];
  machineChangeovers: number;
  gate: PermissionGate;
  expandedIds: Set<string>;
  onToggleExpanded: (operationId: string) => void;
  onNotice: (message: string) => void;
  onError: (message: string) => void;
}

export function OperationsSection({
  garmentId,
  operations,
  machineTypes,
  threads,
  machineChangeovers,
  gate,
  expandedIds,
  onToggleExpanded,
  onNotice,
  onError
}: OperationsSectionProps): JSX.Element {
  const queryClient = useQueryClient();
  const [dragId, setDragId] = useState<string | null>(null);
  const [flashId, setFlashId] = useState<string | null>(null);

  /** Any change to an operation can move a cone count, so the calculation is refetched. */
  function invalidate(): void {
    void queryClient.invalidateQueries({ queryKey: queryKeys.operations(garmentId) });
    void queryClient.invalidateQueries({ queryKey: queryKeys.garmentCalculation(garmentId) });
    void queryClient.invalidateQueries({ queryKey: queryKeys.allGarments });
  }

  function report(caught: unknown, fallback: string): void {
    onError(caught instanceof ApiError ? caught.message : fallback);
  }

  const patch = useMutation({
    mutationFn: (input: {
      id: string;
      patch: { name?: string; machineTypeId?: string | null; seamLengthCm?: number; notes?: string };
    }) => updateOperation(input.id, input.patch),
    onSuccess: invalidate,
    onError: (caught) => report(caught, 'That change could not be saved.')
  });

  const assign = useMutation({
    mutationFn: (input: { id: string; positionId: string; threadId: string | null }) =>
      updateOperationThread(input.id, input.positionId, input.threadId),
    onSuccess: invalidate,
    onError: (caught) => report(caught, 'The thread could not be assigned.')
  });

  const add = useMutation({
    mutationFn: () => createOperation(garmentId, {}),
    onSuccess: (operation) => {
      invalidate();
      setFlashId(operation.id);
      window.setTimeout(() => setFlashId(null), 800);
    },
    onError: (caught) => report(caught, 'The operation could not be added.')
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteOperation(id),
    onSuccess: invalidate,
    onError: (caught) => report(caught, 'The operation could not be deleted.')
  });

  const reorder = useMutation({
    mutationFn: (orderedIds: string[]) => reorderOperations(garmentId, orderedIds),
    onSuccess: invalidate,
    onError: (caught) => report(caught, 'The sequence could not be saved.')
  });

  /** Reordering persists on drop as one atomic request. */
  function moveTo(sourceId: string, targetId: string): void {
    if (sourceId === targetId) return;
    const ids = operations.map((operation) => operation.id);
    const from = ids.indexOf(sourceId);
    const to = ids.indexOf(targetId);
    if (from < 0 || to < 0) return;

    ids.splice(to, 0, ...ids.splice(from, 1));
    setFlashId(sourceId);
    window.setTimeout(() => setFlashId(null), 800);
    reorder.mutate(ids);
  }

  /** Arrow-key fallback for the drag handle. */
  function moveBy(operationId: string, direction: -1 | 1): void {
    const ids = operations.map((operation) => operation.id);
    const from = ids.indexOf(operationId);
    const to = from + direction;
    if (from < 0 || to < 0 || to >= ids.length) return;
    const target = ids[to];
    if (target) moveTo(operationId, target);
  }

  const addButton = (
    <Button
      variant="ink"
      onClick={() => add.mutate()}
      disabled={!gate.can || add.isPending}
      {...(gate.can ? {} : { title: gate.hint })}
    >
      Add first operation
    </Button>
  );

  return (
    <section id="operations">
      <SectionHead
        title={
          <>
            Operations <span className="mono">{operations.length}</span>
          </>
        }
        hint={
          <>
            {gate.can ? null : <span>{gate.hint} · </span>}
            <MachineLegend machineTypes={machineTypes} />
          </>
        }
      />

      {operations.length === 0 ? (
        <div style={{ background: 'var(--paper)', border: '1px solid var(--line)' }}>
          <EmptyState
            title="No operations yet"
            body="Add the first operation to start the sequence. Pick a machine type and the thread positions appear for you to fill."
            action={addButton}
          />
        </div>
      ) : (
        <table className={styles.table}>
          <colgroup>
            <col className={styles.colSeq} />
            <col />
            <col className={styles.colMachine} />
            <col className={styles.colSeam} />
            <col className={styles.colThread} />
            <col className={styles.colActions} />
          </colgroup>
          <thead>
            <tr>
              <th>#</th>
              <th>Operation</th>
              <th>Machine type</th>
              <th style={{ textAlign: 'right' }}>Seam cm</th>
              <th>Thread</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {operations.map((operation) => (
              <OperationRow
                key={operation.id}
                operation={operation}
                machineTypes={machineTypes}
                threads={threads}
                gate={gate}
                expanded={expandedIds.has(operation.id)}
                flashing={flashId === operation.id}
                dragging={dragId === operation.id}
                onToggle={() => onToggleExpanded(operation.id)}
                onPatch={(body) => patch.mutate({ id: operation.id, patch: body })}
                onAssignThread={(positionId, threadId) =>
                  assign.mutate({ id: operation.id, positionId, threadId })
                }
                onThreadCreated={(positionId, thread) => {
                  void queryClient.invalidateQueries({ queryKey: queryKeys.allThreads });
                  assign.mutate({ id: operation.id, positionId, threadId: thread.id });
                  onNotice(
                    `${thread.ticket} ${thread.brand} added to the thread library and assigned.`
                  );
                }}
                onDelete={() => remove.mutate(operation.id)}
                onDragStart={(event: DragEvent<HTMLTableRowElement>) => {
                  setDragId(operation.id);
                  event.dataTransfer.effectAllowed = 'move';
                }}
                onDragOver={(event: DragEvent<HTMLTableRowElement>) => {
                  event.preventDefault();
                  event.dataTransfer.dropEffect = 'move';
                }}
                onDrop={(event: DragEvent<HTMLTableRowElement>) => {
                  event.preventDefault();
                  if (dragId) moveTo(dragId, operation.id);
                  setDragId(null);
                }}
                onDragEnd={() => setDragId(null)}
                onMove={(direction) => moveBy(operation.id, direction)}
              />
            ))}
          </tbody>
        </table>
      )}

      {operations.length > 0 ? (
        <div className={styles.tableFooter}>
          <Button
            variant="invert"
            onClick={() => add.mutate()}
            disabled={!gate.can || add.isPending}
            {...(gate.can ? {} : { title: gate.hint })}
          >
            + Add operation
          </Button>
          <span className={styles.changeovers}>
            Drag a row to resequence. Machine changeovers:{' '}
            <span className={styles.changeoverCount}>{machineChangeovers}</span>
          </span>
        </div>
      ) : null}
    </section>
  );
}
