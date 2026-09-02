import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ApiError } from '../../api/client';
import {
  createFabric,
  deleteFabric,
  fetchFabrics,
  updateFabric,
  type FabricInput
} from '../../api/endpoints';
import { queryKeys } from '../../api/queryKeys';
import { usePermission } from '../../auth/usePermission';
import { Button } from '../../components/Button';
import { DataTable, EmptyRow, SkeletonRows, tableStyles } from '../../components/DataTable';
import { Field, FormPanel, fieldStyles } from '../../components/Field';
import { ErrorNotice, Notice } from '../../components/Notice';
import { Num } from '../../components/Num';
import { DEFAULT_PAGE_SIZE, Pagination } from '../../components/Pagination';
import { FootNote, Screen, ScreenHeader } from '../../components/Screen';
import type { FabricDTO } from '../../api/types';
import listStyles from '../../components/ListFilter.module.css';
import styles from './FabricLibrary.module.css';

const COLUMNS = 7;

interface Draft extends FabricInput {
  gsmText: string;
}

const BLANK: Draft = {
  name: '',
  composition: '',
  gsm: null,
  gsmText: '',
  colour: 'White',
  supplier: '—'
};

function toDraft(fabric: FabricDTO): Draft {
  return {
    name: fabric.name,
    composition: fabric.composition,
    gsm: fabric.gsm,
    gsmText: fabric.gsm === null ? '' : String(fabric.gsm),
    colour: fabric.colour,
    supplier: fabric.supplier
  };
}

export function FabricLibrary(): JSX.Element {
  const queryClient = useQueryClient();
  const gate = usePermission('fabrics');

  const [editing, setEditing] = useState<FabricDTO | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState<number>(DEFAULT_PAGE_SIZE);
  const [search, setSearch] = useState('');

  const fabrics = useQuery({
    queryKey: queryKeys.fabrics(page, search, limit),
    queryFn: ({ signal }) => fetchFabrics({ page, limit, q: search }, signal),
    placeholderData: keepPreviousData
  });

  function refresh(): void {
    void queryClient.invalidateQueries({ queryKey: queryKeys.allFabrics });
    void queryClient.invalidateQueries({ queryKey: queryKeys.allGarments });
  }

  function closeForm(): void {
    setDraft(null);
    setEditing(null);
    setError('');
  }

  const save = useMutation({
    mutationFn: (input: { id: string | null; body: FabricInput }) =>
      input.id === null ? createFabric(input.body) : updateFabric(input.id, input.body),
    onSuccess: (fabric, variables) => {
      setNotice(
        variables.id === null
          ? `${fabric.name} added to the fabric library.`
          : `${fabric.name} updated.`
      );
      closeForm();
      refresh();
    },
    onError: (caught: unknown) => {
      setError(caught instanceof ApiError ? caught.message : 'The fabric could not be saved.');
    }
  });

  const remove = useMutation({
    mutationFn: (fabric: FabricDTO) => deleteFabric(fabric.id),
    onSuccess: (_result, fabric) => {
      setNotice(`${fabric.name} removed from the library.`);
      refresh();
    },
    onError: (caught: unknown) => {
      // "…is used on STY-4471, STY-4488. Remove it from those garments first."
      setNotice(caught instanceof ApiError ? caught.message : 'The fabric could not be removed.');
    }
  });

  function submit(): void {
    if (!draft) return;
    setError('');

    const trimmedGsm = draft.gsmText.trim();
    const gsm = trimmedGsm === '' ? null : Number(trimmedGsm);
    if (gsm !== null && (!Number.isFinite(gsm) || gsm < 1)) {
      setError('GSM must be a positive number, or left blank for tapes and trims.');
      return;
    }

    save.mutate({
      id: editing?.id ?? null,
      body: {
        name: draft.name.trim(),
        composition: draft.composition.trim(),
        gsm,
        colour: draft.colour.trim() === '' ? 'White' : draft.colour.trim(),
        supplier: draft.supplier.trim() === '' ? '—' : draft.supplier.trim()
      }
    });
  }

  const rows = fabrics.data?.items ?? [];
  const total = fabrics.data?.total ?? 0;
  const showSkeleton = fabrics.isLoading && fabrics.data === undefined;

  return (
    <Screen>
      <ScreenHeader
        title="Fabric library"
        subline={gate.can ? undefined : gate.hint}
        actions={
          <Button
            variant="ink"
            onClick={() => {
              setEditing(null);
              setDraft(BLANK);
              setError('');
            }}
            {...gate.lock}
          >
            + New fabric
          </Button>
        }
      />

      {notice ? <Notice variant="warning">{notice}</Notice> : null}

      {draft ? (
        <FormPanel
          title={editing ? `Edit fabric — ${editing.name}` : 'New fabric'}
          error={error}
          actions={
            <>
              <Button variant="ink" onClick={submit} disabled={save.isPending}>
                {editing ? 'Save changes' : 'Create fabric'}
              </Button>
              <Button onClick={closeForm}>Cancel</Button>
            </>
          }
        >
          <div className={styles.formGrid}>
            <Field label="Fabric name" htmlFor="fabric-name">
              <input
                id="fabric-name"
                className={fieldStyles.input}
                value={draft.name}
                onChange={(event) => setDraft({ ...draft, name: event.target.value })}
              />
            </Field>
            <Field label="Composition" htmlFor="fabric-composition">
              <input
                id="fabric-composition"
                className={fieldStyles.input}
                value={draft.composition}
                onChange={(event) => setDraft({ ...draft, composition: event.target.value })}
              />
            </Field>
            <Field label="GSM" htmlFor="fabric-gsm">
              <input
                id="fabric-gsm"
                className={`${fieldStyles.input} ${fieldStyles.mono} ${fieldStyles.right}`}
                inputMode="numeric"
                value={draft.gsmText}
                onChange={(event) => setDraft({ ...draft, gsmText: event.target.value })}
              />
            </Field>
            <Field label="Colour" htmlFor="fabric-colour">
              <input
                id="fabric-colour"
                className={fieldStyles.input}
                value={draft.colour}
                onChange={(event) => setDraft({ ...draft, colour: event.target.value })}
              />
            </Field>
            <Field label="Supplier" htmlFor="fabric-supplier">
              <input
                id="fabric-supplier"
                className={fieldStyles.input}
                value={draft.supplier}
                onChange={(event) => setDraft({ ...draft, supplier: event.target.value })}
              />
            </Field>
          </div>
        </FormPanel>
      ) : null}

      <ErrorNotice error={fabrics.error} />

      <div className={listStyles.filterBar}>
        <input
          className={listStyles.searchInput}
          placeholder="Search fabric, composition or supplier"
          aria-label="Search fabric, composition or supplier"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
        />
      </div>

      <DataTable hoverRows attached>
        <thead>
          <tr>
            <th>Fabric</th>
            <th>Composition</th>
            <th className={tableStyles.right}>GSM</th>
            <th>Colour</th>
            <th>Supplier</th>
            <th>Used on</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {showSkeleton ? <SkeletonRows rows={3} columns={COLUMNS} /> : null}

          {!showSkeleton && rows.length === 0 ? (
            <EmptyRow columns={COLUMNS}>
              {search ? 'No fabrics match this search.' : 'No fabrics in the library yet.'}
            </EmptyRow>
          ) : null}

          {rows.map((fabric) => {
            const inUse = fabric.usedOn.length > 0;
            const deleteHint = inUse
              ? `In use on ${fabric.usedOn.length} style(s)`
              : gate.can
                ? undefined
                : gate.hint;

            return (
              <tr key={fabric.id}>
                <td className={tableStyles.strong}>{fabric.name}</td>
                <td>{fabric.composition}</td>
                <td className={`${tableStyles.right} ${tableStyles.mono}`}>
                  <Num value={fabric.gsm} />
                </td>
                <td>{fabric.colour}</td>
                <td>{fabric.supplier}</td>
                <td className={tableStyles.mono}>
                  {inUse ? fabric.usedOn.join(', ') : <span className={tableStyles.soft}>not used</span>}
                </td>
                <td>
                  <div className={styles.rowActions}>
                    <button
                      type="button"
                      className={styles.action}
                      disabled={!gate.can}
                      aria-disabled={!gate.can || undefined}
                      {...(gate.can ? {} : { title: gate.hint })}
                      onClick={() => {
                        setEditing(fabric);
                        setDraft(toDraft(fabric));
                        setError('');
                      }}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className={`${styles.action} ${inUse || !gate.can ? styles.actionLocked : ''}`}
                      disabled={!gate.can || inUse}
                      aria-disabled={!gate.can || inUse || undefined}
                      {...(deleteHint ? { title: deleteHint } : {})}
                      onClick={() => remove.mutate(fabric)}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </DataTable>


      <Pagination
        page={page}
        limit={limit}
        total={total}
        noun="fabrics"
        onPage={setPage}
        onLimit={(next) => {
          setLimit(next);
          setPage(1);
        }}
      />

      <FootNote>
        A fabric cannot be deleted while it is assigned to a garment.
      </FootNote>
    </Screen>
  );
}
