import { useEffect, useState, type DragEvent } from 'react';
import type { MachineTypeDTO, OperationDTO, ThreadDTO } from '../../api/types';
import { Num } from '../../components/Num';
import { useDebouncedCallback } from '../../lib/useDebouncedCallback';
import { zeroPad } from '../../lib/format';
import type { PermissionGate } from '../../auth/usePermission';
import { NewThreadForm } from './NewThreadForm';
import styles from './Operations.module.css';

const NEW_THREAD = '__new__';

interface OperationRowProps {
  operation: OperationDTO;
  machineTypes: MachineTypeDTO[];
  threads: ThreadDTO[];
  gate: PermissionGate;
  expanded: boolean;
  flashing: boolean;
  dragging: boolean;
  onToggle: () => void;
  onPatch: (patch: { name?: string; machineTypeId?: string | null; seamLengthCm?: number; notes?: string }) => void;
  onAssignThread: (positionId: string, threadId: string | null) => void;
  onThreadCreated: (positionId: string, thread: ThreadDTO) => void;
  onDelete: () => void;
  onDragStart: (event: DragEvent<HTMLTableRowElement>) => void;
  onDragOver: (event: DragEvent<HTMLTableRowElement>) => void;
  onDrop: (event: DragEvent<HTMLTableRowElement>) => void;
  onDragEnd: () => void;
  onMove: (direction: -1 | 1) => void;
}

export function OperationRow({
  operation,
  machineTypes,
  threads,
  gate,
  expanded,
  flashing,
  dragging,
  onToggle,
  onPatch,
  onAssignThread,
  onThreadCreated,
  onDelete,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onMove
}: OperationRowProps): JSX.Element {
  // Local drafts so typing stays responsive; the PATCH follows on a debounce.
  const [name, setName] = useState(operation.name);
  const [seam, setSeam] = useState(String(operation.seamLengthCm));
  const [notes, setNotes] = useState(operation.notes);
  const [newThreadFor, setNewThreadFor] = useState<string | null>(null);

  useEffect(() => setName(operation.name), [operation.name]);
  useEffect(() => setSeam(String(operation.seamLengthCm)), [operation.seamLengthCm]);
  useEffect(() => setNotes(operation.notes), [operation.notes]);

  const pushName = useDebouncedCallback((value: string) => onPatch({ name: value }));
  const pushNotes = useDebouncedCallback((value: string) => onPatch({ notes: value }));
  const pushSeam = useDebouncedCallback((value: number) => onPatch({ seamLengthCm: value }));

  const seamValue = Number(seam);
  const seamInvalid = !Number.isFinite(seamValue) || seamValue <= 0;
  const machineType = machineTypes.find((entry) => entry.id === operation.machineTypeId) ?? null;

  return (
    <>
      <tr
        className={`${styles.row} ${dragging ? styles.rowDragging : ''} ${flashing ? 'rowFlash' : ''}`}
        draggable={gate.can}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onDragEnd={onDragEnd}
      >
        <td>
          <div className={styles.seqCell}>
            <span
              className={styles.handle}
              title="Drag to reorder"
              role="button"
              tabIndex={gate.can ? 0 : -1}
              aria-label={`Reorder ${operation.name || 'operation'} — use the arrow keys`}
              onKeyDown={(event) => {
                if (!gate.can) return;
                if (event.key === 'ArrowUp') {
                  event.preventDefault();
                  onMove(-1);
                }
                if (event.key === 'ArrowDown') {
                  event.preventDefault();
                  onMove(1);
                }
              }}
            >
              ⠿
            </span>
            <span className={styles.seq}>{zeroPad(operation.sequence)}</span>
          </div>
        </td>

        <td>
          <input
            className={styles.seamInput}
            style={{ textAlign: 'left' }}
            placeholder="Name this operation"
            aria-label={`Operation ${operation.sequence} name`}
            value={name}
            disabled={!gate.can}
            {...(gate.can ? {} : { title: gate.hint })}
            onChange={(event) => {
              setName(event.target.value);
              pushName(event.target.value);
            }}
          />
        </td>

        <td>
          <div className={styles.machineCell}>
            <span
              className={styles.machineSwatch}
              style={machineType ? { background: machineType.colour } : undefined}
            />
            <select
              className={styles.machineSelect}
              value={operation.machineTypeId ?? ''}
              disabled={!gate.can}
              aria-label={`Machine type for operation ${operation.sequence}`}
              {...(gate.can ? {} : { title: gate.hint })}
              onChange={(event) =>
                onPatch({ machineTypeId: event.target.value === '' ? null : event.target.value })
              }
            >
              <option value="">Select machine type</option>
              {machineTypes.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.name}
                </option>
              ))}
            </select>
          </div>
        </td>

        <td>
          <input
            className={styles.seamInput}
            inputMode="decimal"
            aria-label={`Seam length for operation ${operation.sequence}`}
            value={seam}
            disabled={!gate.can}
            {...(gate.can ? {} : { title: gate.hint })}
            onChange={(event) => {
              setSeam(event.target.value);
              const parsed = Number(event.target.value);
              if (Number.isFinite(parsed) && parsed >= 0) pushSeam(parsed);
            }}
          />
          {seamInvalid ? <div className={styles.seamError}>must be &gt; 0</div> : null}
        </td>

        <td>
          <div className={styles.threadSummary}>
            {operation.threadSummary || (operation.machineTypeId ? '' : 'No machine type selected')}
            {!operation.isComplete ? (
              <span className={styles.incomplete}>
                {operation.machineTypeId ? 'incomplete' : 'no machine'}
              </span>
            ) : null}
          </div>
        </td>

        <td>
          <div className={styles.actionCell}>
            <button
              type="button"
              className={styles.toggle}
              aria-expanded={expanded}
              onClick={onToggle}
            >
              {expanded ? '▲ threads' : '▼ threads'}
            </button>
            <button
              type="button"
              className={styles.delete}
              aria-label={`Delete operation ${operation.sequence}`}
              disabled={!gate.can}
              {...(gate.can ? {} : { title: gate.hint })}
              onClick={onDelete}
            >
              ✕
            </button>
          </div>
        </td>
      </tr>

      {expanded ? (
        <tr className={styles.panelRow}>
          <td colSpan={6}>
            <div
              className={styles.panel}
              style={{ ['--machine-colour' as string]: machineType?.colour ?? 'var(--line)' }}
            >
              <div>
                <div className={styles.panelHeading}>
                  {machineType
                    ? `Thread positions defined by ${machineType.name} — ${machineType.positions
                        .map(
                          (position) =>
                            `${position.count} ${position.position.toLowerCase().replace('_', ' ')}`
                        )
                        .join(', ')}`
                    : 'Pick a machine type and the thread positions appear for you to fill.'}
                </div>

                {machineType ? (
                  <table className={styles.positionTable}>
                    <thead>
                      <tr>
                        <th>Position</th>
                        <th>Count</th>
                        <th>Thread</th>
                        <th>Ratio m/m</th>
                        <th>m per garment</th>
                      </tr>
                    </thead>
                    <tbody>
                      {operation.positions.map((position) => (
                        <tr key={position.id}>
                          <td className="mono">{position.position}</td>
                          <td className="mono">{position.count}</td>
                          <td>
                            <select
                              className={styles.threadSelect}
                              value={
                                newThreadFor === position.id ? NEW_THREAD : position.threadId ?? ''
                              }
                              disabled={!gate.can}
                              aria-label={`Thread at ${position.position}`}
                              {...(gate.can ? {} : { title: gate.hint })}
                              onChange={(event) => {
                                if (event.target.value === NEW_THREAD) {
                                  setNewThreadFor(position.id);
                                  return;
                                }
                                setNewThreadFor(null);
                                onAssignThread(
                                  position.id,
                                  event.target.value === '' ? null : event.target.value
                                );
                              }}
                            >
                              <option value="">— unassigned —</option>
                              {threads.map((thread) => (
                                <option key={thread.id} value={thread.id}>
                                  {thread.ticket} {thread.brand} · {thread.composition} ·{' '}
                                  {thread.colour}
                                </option>
                              ))}
                              <option value={NEW_THREAD}>+ New thread…</option>
                            </select>
                          </td>
                          <td className="mono" style={{ color: 'var(--ink-soft)' }}>
                            {position.consumptionRatio.toFixed(1)}
                          </td>
                          <td className="mono" style={{ fontWeight: 500 }}>
                            <Num value={position.metresPerGarment} decimals={2} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : null}

                {newThreadFor ? (
                  <NewThreadForm
                    onCreated={(thread) => {
                      onThreadCreated(newThreadFor, thread);
                      setNewThreadFor(null);
                    }}
                    onCancel={() => setNewThreadFor(null)}
                  />
                ) : null}
              </div>

              <div>
                <div className={styles.notesLabel}>Operation notes</div>
                <textarea
                  className={styles.notes}
                  placeholder="Stitch density, allowance, changeover note"
                  aria-label={`Notes for operation ${operation.sequence}`}
                  value={notes}
                  disabled={!gate.can}
                  {...(gate.can ? {} : { title: gate.hint })}
                  onChange={(event) => {
                    setNotes(event.target.value);
                    pushNotes(event.target.value);
                  }}
                />
                <div className={styles.operationTotal}>
                  <span>Operation total</span>
                  <span>
                    <span className={styles.operationTotalValue}>
                      <Num value={operation.operationMetres} decimals={2} />
                    </span>{' '}
                    m / garment
                  </span>
                </div>
              </div>
            </div>
          </td>
        </tr>
      ) : null}
    </>
  );
}
