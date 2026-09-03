import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ApiError } from '../../api/client';
import {
  createMachineType,
  deleteMachineType,
  fetchMachineTypes,
  updateMachineType,
  updatePositionRatio,
  type MachinePositionInput,
  type MachineTypeInput
} from '../../api/endpoints';
import { queryKeys } from '../../api/queryKeys';
import { POSITIONS, type MachineTypeDTO, type PositionName } from '../../api/types';
import { usePermission } from '../../auth/usePermission';
import { Button } from '../../components/Button';
import { DataTable, tableStyles } from '../../components/DataTable';
import { CommitNumberInput, Field, FormPanel, fieldStyles } from '../../components/Field';
import { Notice } from '../../components/Notice';
import { Num } from '../../components/Num';
import { DEFAULT_PAGE_SIZE, Pagination } from '../../components/Pagination';
import { FootNote, Screen, ScreenHeader } from '../../components/Screen';
import listStyles from '../../components/ListFilter.module.css';
import styles from './MachineTypes.module.css';

/**
 * The six documented machine-type colours. This is the only decorative colour in the app and
 * the spec says not to invent more, so the picker offers exactly these.
 */
const PALETTE = [
  { colour: '#2F5BD0', name: 'Overlock blue' },
  { colour: '#17795A', name: 'Flatlock green' },
  { colour: '#B4560F', name: 'Lock stitch amber' },
  { colour: '#7A3FBF', name: 'Chain stitch violet' },
  { colour: '#0E7290', name: 'Double chain teal' },
  { colour: '#A83070', name: 'Bartack magenta' }
] as const;

const POSITION_LABELS: Record<PositionName, string> = {
  NEEDLE: 'Needle',
  UPPER_LOOPER: 'Upper looper',
  LOWER_LOOPER: 'Lower looper',
  BOBBIN: 'Bobbin',
  SPREADER: 'Spreader'
};

interface PositionDraft {
  position: PositionName;
  countText: string;
  ratioText: string;
}

interface Draft {
  name: string;
  code: string;
  colour: string;
  positions: PositionDraft[];
}

const BLANK: Draft = {
  name: '',
  code: '',
  colour: '#2F5BD0',
  positions: [{ position: 'NEEDLE', countText: '1', ratioText: '1.0' }]
};

function toDraft(machineType: MachineTypeDTO): Draft {
  return {
    name: machineType.name,
    code: machineType.code,
    colour: machineType.colour,
    positions: machineType.positions.map((position) => ({
      position: position.position,
      countText: String(position.count),
      ratioText: String(position.consumptionRatio)
    }))
  };
}

/** True when the position list differs from what the record already holds. */
function positionsChanged(draft: PositionDraft[], original: MachineTypeDTO): boolean {
  if (draft.length !== original.positions.length) return true;
  return draft.some((row, index) => {
    const existing = original.positions[index];
    if (!existing) return true;
    return (
      row.position !== existing.position ||
      Number(row.countText) !== existing.count ||
      Number(row.ratioText) !== existing.consumptionRatio
    );
  });
}

export function MachineTypes(): JSX.Element {
  const queryClient = useQueryClient();
  const master = usePermission('master');

  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [editing, setEditing] = useState<MachineTypeDTO | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState<number>(DEFAULT_PAGE_SIZE);
  const [search, setSearch] = useState('');

  const machineTypes = useQuery({
    queryKey: queryKeys.machineTypes(page, search, limit),
    queryFn: ({ signal }) => fetchMachineTypes({ page, limit, q: search }, signal),
    placeholderData: keepPreviousData
  });

  const total = machineTypes.data?.total ?? 0;

  /** A machine type feeds every calculation that uses it — invalidate broadly. */
  function refresh(): void {
    void queryClient.invalidateQueries({ queryKey: queryKeys.allMachineTypes });
    void queryClient.invalidateQueries({ queryKey: queryKeys.allCalculations });
    void queryClient.invalidateQueries({ queryKey: queryKeys.allGarments });
  }

  function closeForm(): void {
    setDraft(null);
    setEditing(null);
    setError('');
  }

  const saveRatio = useMutation({
    mutationFn: (input: { machineTypeId: string; positionId: string; consumptionRatio: number }) =>
      updatePositionRatio(input.machineTypeId, input.positionId, input.consumptionRatio),
    onSuccess: () => {
      setError('');
      refresh();
    },
    onError: (caught: unknown) => {
      setError(caught instanceof ApiError ? caught.message : 'The ratio could not be saved.');
    }
  });

  const save = useMutation({
    mutationFn: (input: { id: string | null; body: Partial<MachineTypeInput> }) =>
      input.id === null
        ? createMachineType(input.body as MachineTypeInput)
        : updateMachineType(input.id, input.body),
    onSuccess: (machineType, variables) => {
      setNotice(
        variables.id === null
          ? `${machineType.name} added to the machine types.`
          : `${machineType.name} updated.`
      );
      closeForm();
      refresh();
    },
    onError: (caught: unknown) => {
      setError(caught instanceof ApiError ? caught.message : 'The machine type could not be saved.');
    }
  });

  const remove = useMutation({
    mutationFn: (machineType: MachineTypeDTO) => deleteMachineType(machineType.id),
    onSuccess: (_result, machineType) => {
      setNotice(`${machineType.name} removed from the machine types.`);
      refresh();
    },
    onError: (caught: unknown) => {
      // "…is used by 12 operations. Change those operations first."
      setNotice(
        caught instanceof ApiError ? caught.message : 'The machine type could not be removed.'
      );
    }
  });

  function submit(): void {
    if (!draft) return;
    setError('');

    if (draft.name.trim() === '') {
      setError('Machine type name is required.');
      return;
    }
    if (draft.code.trim() === '') {
      setError('Machine code is required.');
      return;
    }
    if (draft.positions.length === 0) {
      setError('A machine type needs at least one thread position.');
      return;
    }

    const seen = new Set<PositionName>();
    const positions: MachinePositionInput[] = [];

    for (const row of draft.positions) {
      if (seen.has(row.position)) {
        setError('Each thread position can only be listed once on a machine type.');
        return;
      }
      seen.add(row.position);

      const count = Number(row.countText.trim());
      if (!Number.isInteger(count) || count < 1 || count > 12) {
        setError(`${POSITION_LABELS[row.position]} count must be a whole number between 1 and 12.`);
        return;
      }

      const consumptionRatio = Number(row.ratioText.trim());
      if (!Number.isFinite(consumptionRatio) || consumptionRatio < 0.1 || consumptionRatio > 40) {
        setError(`${POSITION_LABELS[row.position]} ratio must be between 0.1 and 40.`);
        return;
      }

      positions.push({ position: row.position, count, consumptionRatio });
    }

    const identity = {
      name: draft.name.trim(),
      code: draft.code.trim().toUpperCase(),
      colour: draft.colour
    };

    // Only send `positions` when they actually changed: the server mints new position ids
    // for the whole array, which clears every thread assignment on this machine.
    const body: Partial<MachineTypeInput> =
      editing && !positionsChanged(draft.positions, editing)
        ? identity
        : { ...identity, positions };

    save.mutate({ id: editing?.id ?? null, body });
  }

  const editingInUse = editing !== null && editing.usage.operations > 0;
  const willVoidThreads =
    editing !== null && editingInUse && draft !== null && positionsChanged(draft.positions, editing);

  return (
    <Screen>
      <ScreenHeader
        title="Machine types"
        subline="The machine type defines the thread positions and consumption ratios"
        actions={
          <Button
            variant="ink"
            onClick={() => {
              setEditing(null);
              setDraft(BLANK);
              setError('');
            }}
            {...master.lock}
          >
            + New machine type
          </Button>
        }
      />

      {notice ? <Notice variant="warning">{notice}</Notice> : null}
      {error && !draft ? <Notice variant="warning">{error}</Notice> : null}

      {draft ? (
        <FormPanel
          title={editing ? `Edit machine type — ${editing.name}` : 'New machine type'}
          error={error}
          actions={
            <>
              <Button variant="ink" onClick={submit} disabled={save.isPending}>
                {editing ? 'Save changes' : 'Create machine type'}
              </Button>
              <Button onClick={closeForm}>Cancel</Button>
            </>
          }
        >
          <div className={styles.identityGrid}>
            <Field label="Machine type name" htmlFor="machine-name">
              <input
                id="machine-name"
                className={fieldStyles.input}
                value={draft.name}
                onChange={(event) => setDraft({ ...draft, name: event.target.value })}
              />
            </Field>
            <Field label="Code" htmlFor="machine-code" hint="Shown in the legend">
              <input
                id="machine-code"
                className={`${fieldStyles.input} ${fieldStyles.mono}`}
                value={draft.code}
                onChange={(event) => setDraft({ ...draft, code: event.target.value.toUpperCase() })}
              />
            </Field>
          </div>

          <div className={styles.colourField}>
            <Field label="Colour" hint="Used for the machine token everywhere it appears">
              <div className={styles.swatches}>
                {PALETTE.map((entry) => (
                  <button
                    key={entry.colour}
                    type="button"
                    title={entry.name}
                    aria-label={entry.name}
                    aria-pressed={draft.colour === entry.colour}
                    className={`${styles.swatch} ${
                      draft.colour === entry.colour ? styles.swatchActive : ''
                    }`}
                    style={{ ['--swatch-colour' as string]: entry.colour }}
                    onClick={() => setDraft({ ...draft, colour: entry.colour })}
                  />
                ))}
              </div>
            </Field>
          </div>

          <div className={styles.positionsHead}>
            <span className={styles.positionsTitle}>Thread positions</span>
            <span className={styles.positionsNote}>
              Count is how many of that position the machine has; ratio is metres of thread per
              metre of seam.
            </span>
          </div>

          {draft.positions.map((row, index) => (
            <div key={index} className={styles.positionRow}>
              <Field label="Position">
                <select
                  className={fieldStyles.select}
                  value={row.position}
                  aria-label={`Position ${index + 1}`}
                  onChange={(event) => {
                    const next = [...draft.positions];
                    next[index] = { ...row, position: event.target.value as PositionName };
                    setDraft({ ...draft, positions: next });
                  }}
                >
                  {POSITIONS.map((position) => (
                    <option key={position} value={position}>
                      {POSITION_LABELS[position]}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Count">
                <input
                  className={`${fieldStyles.input} ${fieldStyles.mono} ${fieldStyles.right}`}
                  inputMode="numeric"
                  aria-label={`Position ${index + 1} count`}
                  value={row.countText}
                  onChange={(event) => {
                    const next = [...draft.positions];
                    next[index] = { ...row, countText: event.target.value };
                    setDraft({ ...draft, positions: next });
                  }}
                />
              </Field>
              <Field label="Ratio m/m">
                <input
                  className={`${fieldStyles.input} ${fieldStyles.mono} ${fieldStyles.right}`}
                  inputMode="decimal"
                  aria-label={`Position ${index + 1} consumption ratio`}
                  value={row.ratioText}
                  onChange={(event) => {
                    const next = [...draft.positions];
                    next[index] = { ...row, ratioText: event.target.value };
                    setDraft({ ...draft, positions: next });
                  }}
                />
              </Field>
              <button
                type="button"
                className={styles.removePosition}
                title="Remove this position"
                aria-label={`Remove position ${index + 1}`}
                disabled={draft.positions.length === 1}
                onClick={() =>
                  setDraft({
                    ...draft,
                    positions: draft.positions.filter((_row, at) => at !== index)
                  })
                }
              >
                ✕
              </button>
            </div>
          ))}

          <Button
            variant="invert"
            onClick={() =>
              setDraft({
                ...draft,
                positions: [
                  ...draft.positions,
                  { position: 'NEEDLE', countText: '1', ratioText: '1.0' }
                ]
              })
            }
          >
            + Add position
          </Button>

          {willVoidThreads ? (
            <div className={styles.destructive} role="alert">
              <strong>This clears thread assignments.</strong> {editing.usage.operations} operation
              {editing.usage.operations === 1 ? '' : 's'} on {editing.usage.styles} style
              {editing.usage.styles === 1 ? '' : 's'} use {editing.name}. Changing its positions
              replaces them, so every thread already assigned on this machine becomes unassigned
              and those operations will need reassigning before a cone order can be created.
            </div>
          ) : null}
        </FormPanel>
      ) : null}

      <div className={`${listStyles.filterBar} ${listStyles.standalone}`}>
        <input
          className={listStyles.searchInput}
          placeholder="Search machine type or code"
          aria-label="Search machine type or code"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
        />
      </div>

      <div className={styles.grid}>
        {(machineTypes.data?.items ?? []).map((machineType) => {
          const inUse = machineType.usage.operations > 0;
          const deleteHint = inUse
            ? `In use on ${machineType.usage.operations} operation(s)`
            : master.can
              ? undefined
              : master.hint;

          return (
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
                <span className={styles.headActions}>
                  <button
                    type="button"
                    className={styles.action}
                    disabled={!master.can}
                    aria-disabled={!master.can || undefined}
                    {...(master.can ? {} : { title: master.hint })}
                    onClick={() => {
                      setEditing(machineType);
                      setDraft(toDraft(machineType));
                      setError('');
                    }}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className={`${styles.action} ${inUse || !master.can ? styles.actionLocked : ''}`}
                    disabled={!master.can || inUse}
                    aria-disabled={!master.can || inUse || undefined}
                    {...(deleteHint ? { title: deleteHint } : {})}
                    onClick={() => remove.mutate(machineType)}
                  >
                    Delete
                  </button>
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
                      <td data-label="Position" className={tableStyles.mono}>
                        {position.position}
                      </td>
                      <td data-label="Count" className={`${tableStyles.right} ${tableStyles.mono}`}>
                        <Num value={position.count} />
                      </td>
                      <td data-label="Consumption m/m">
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

              <div className={styles.cardFoot}>
                {inUse ? (
                  <>
                    Used by <Num value={machineType.usage.operations} /> operation
                    {machineType.usage.operations === 1 ? '' : 's'} on{' '}
                    <Num value={machineType.usage.styles} /> style
                    {machineType.usage.styles === 1 ? '' : 's'}
                  </>
                ) : (
                  'Not used by any operation'
                )}
              </div>
            </div>
          );
        })}
      </div>

      <Pagination
        page={page}
        limit={limit}
        total={total}
        noun="machine types"
        onPage={setPage}
        onLimit={(next) => {
          setLimit(next);
          setPage(1);
        }}
      />

      <FootNote>
        Changing a consumption ratio recalculates every operation on that machine type, on every
        garment. A machine type cannot be deleted while an operation uses it.
      </FootNote>
    </Screen>
  );
}
