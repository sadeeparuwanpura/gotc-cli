import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ApiError } from '../../api/client';
import {
  createThread,
  deleteThread,
  fetchThreads,
  updateThread,
  type ThreadInput
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
import type { ThreadDTO } from '../../api/types';
import listStyles from '../../components/ListFilter.module.css';
import styles from './ThreadLibrary.module.css';

const COLUMNS = 8;

/** Ticket is inverse weight — a higher ticket is a finer thread. */
const TICKET_MIN = 8;
const TICKET_MAX = 400;
const TICKET_MESSAGE = `Ticket must be between ${TICKET_MIN} and ${TICKET_MAX}. Higher ticket means finer thread.`;

/** Numbers are held as text while typing so a half-typed value is not coerced to 0. */
interface Draft {
  brand: string;
  ticketText: string;
  composition: string;
  colour: string;
  coneYieldText: string;
  unitPriceText: string;
}

const BLANK: Draft = {
  brand: '',
  ticketText: '',
  composition: '',
  colour: 'White',
  coneYieldText: '5000',
  unitPriceText: ''
};

function toDraft(thread: ThreadDTO): Draft {
  return {
    brand: thread.brand,
    ticketText: String(thread.ticket),
    composition: thread.composition,
    colour: thread.colour,
    coneYieldText: String(thread.coneYieldM),
    unitPriceText: thread.unitPrice === 0 ? '' : String(thread.unitPrice)
  };
}

export function ThreadLibrary(): JSX.Element {
  const queryClient = useQueryClient();
  const master = usePermission('master');

  const [editing, setEditing] = useState<ThreadDTO | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState<number>(DEFAULT_PAGE_SIZE);
  const [search, setSearch] = useState('');

  const threads = useQuery({
    queryKey: queryKeys.threads(page, search, limit),
    queryFn: ({ signal }) => fetchThreads({ page, limit, q: search }, signal),
    placeholderData: keepPreviousData
  });

  /**
   * A thread's cone yield feeds every cone count that uses it, so editing one can change a
   * number on any garment — invalidate the calculations too.
   */
  function refresh(): void {
    void queryClient.invalidateQueries({ queryKey: queryKeys.allThreads });
    void queryClient.invalidateQueries({ queryKey: queryKeys.allGarments });
    void queryClient.invalidateQueries({ queryKey: queryKeys.allCalculations });
  }

  function closeForm(): void {
    setDraft(null);
    setEditing(null);
    setError('');
  }

  const save = useMutation({
    mutationFn: (input: { id: string | null; body: ThreadInput }) =>
      input.id === null ? createThread(input.body) : updateThread(input.id, input.body),
    onSuccess: (thread, variables) => {
      setNotice(
        variables.id === null
          ? `${thread.ticket} ${thread.brand} added to the thread library.`
          : `${thread.ticket} ${thread.brand} updated.`
      );
      closeForm();
      refresh();
    },
    onError: (caught: unknown) => {
      setError(caught instanceof ApiError ? caught.message : 'The thread could not be saved.');
    }
  });

  const remove = useMutation({
    mutationFn: (thread: ThreadDTO) => deleteThread(thread.id),
    onSuccess: (_result, thread) => {
      setNotice(`${thread.ticket} ${thread.brand} removed from the library.`);
      refresh();
    },
    onError: (caught: unknown) => {
      // "…is assigned to 4 operations. Set it inactive instead of deleting it."
      setNotice(caught instanceof ApiError ? caught.message : 'The thread could not be removed.');
    }
  });

  function submit(): void {
    if (!draft) return;
    setError('');

    if (draft.brand.trim() === '') {
      setError('Brand is required.');
      return;
    }

    const ticket = Number(draft.ticketText.trim());
    if (
      !Number.isInteger(ticket) ||
      ticket < TICKET_MIN ||
      ticket > TICKET_MAX
    ) {
      setError(TICKET_MESSAGE);
      return;
    }

    if (draft.composition.trim() === '') {
      setError('Composition is required.');
      return;
    }

    const coneYieldM = Number(draft.coneYieldText.trim());
    if (!Number.isFinite(coneYieldM) || coneYieldM < 1) {
      setError('Cone yield must be a positive number of metres.');
      return;
    }

    const priceText = draft.unitPriceText.trim();
    const unitPrice = priceText === '' ? 0 : Number(priceText);
    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      setError('Unit price must be zero or more.');
      return;
    }

    save.mutate({
      id: editing?.id ?? null,
      body: {
        brand: draft.brand.trim(),
        ticket,
        composition: draft.composition.trim(),
        colour: draft.colour.trim() === '' ? 'White' : draft.colour.trim(),
        coneYieldM,
        unitPrice
      }
    });
  }

  const rows = threads.data?.items ?? [];
  const total = threads.data?.total ?? 0;
  const showSkeleton = threads.isLoading && threads.data === undefined;

  return (
    <Screen>
      <ScreenHeader
        title="Thread library"
        subline="Ticket number is inverse weight — a higher ticket is a finer thread"
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
            + New thread
          </Button>
        }
      />

      {notice ? <Notice variant="warning">{notice}</Notice> : null}

      {draft ? (
        <FormPanel
          title={editing ? `Edit thread — ${editing.ticket} ${editing.brand}` : 'New thread'}
          error={error}
          actions={
            <>
              <Button variant="ink" onClick={submit} disabled={save.isPending}>
                {editing ? 'Save changes' : 'Create thread'}
              </Button>
              <Button onClick={closeForm}>Cancel</Button>
            </>
          }
        >
          <div className={styles.formGrid}>
            <Field label="Brand" htmlFor="thread-brand">
              <input
                id="thread-brand"
                className={fieldStyles.input}
                value={draft.brand}
                onChange={(event) => setDraft({ ...draft, brand: event.target.value })}
              />
            </Field>
            <Field label="Ticket" htmlFor="thread-ticket" hint="Higher is finer">
              <input
                id="thread-ticket"
                className={`${fieldStyles.input} ${fieldStyles.mono} ${fieldStyles.right}`}
                inputMode="numeric"
                value={draft.ticketText}
                onChange={(event) => setDraft({ ...draft, ticketText: event.target.value })}
              />
            </Field>
            <Field label="Composition" htmlFor="thread-composition">
              <input
                id="thread-composition"
                className={fieldStyles.input}
                value={draft.composition}
                onChange={(event) => setDraft({ ...draft, composition: event.target.value })}
              />
            </Field>
            <Field label="Colour" htmlFor="thread-colour">
              <input
                id="thread-colour"
                className={fieldStyles.input}
                value={draft.colour}
                onChange={(event) => setDraft({ ...draft, colour: event.target.value })}
              />
            </Field>
            <Field label="Cone yield m" htmlFor="thread-yield">
              <input
                id="thread-yield"
                className={`${fieldStyles.input} ${fieldStyles.mono} ${fieldStyles.right}`}
                inputMode="numeric"
                value={draft.coneYieldText}
                onChange={(event) => setDraft({ ...draft, coneYieldText: event.target.value })}
              />
            </Field>
            <Field label="Unit price" htmlFor="thread-price" hint="Optional">
              <input
                id="thread-price"
                className={`${fieldStyles.input} ${fieldStyles.mono} ${fieldStyles.right}`}
                inputMode="decimal"
                value={draft.unitPriceText}
                onChange={(event) => setDraft({ ...draft, unitPriceText: event.target.value })}
              />
            </Field>
          </div>
        </FormPanel>
      ) : null}

      <ErrorNotice error={threads.error} />

      <div className={listStyles.filterBar}>
        <input
          className={listStyles.searchInput}
          placeholder="Search brand, composition or colour"
          aria-label="Search brand, composition or colour"
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
            <th>Brand</th>
            <th className={tableStyles.right}>Ticket</th>
            <th>Composition</th>
            <th>Colour</th>
            <th className={tableStyles.right}>Cone yield m</th>
            <th className={tableStyles.right}>Unit price</th>
            <th>Usage</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {showSkeleton ? <SkeletonRows rows={3} columns={COLUMNS} /> : null}

          {!showSkeleton && rows.length === 0 ? (
            <EmptyRow columns={COLUMNS}>
              {search ? 'No threads match this search.' : 'No threads in the library yet.'}
            </EmptyRow>
          ) : null}

          {rows.map((thread) => {
            const inUse = thread.usage.styles > 0;
            const deleteHint = inUse
              ? `In use on ${thread.usage.styles} style(s)`
              : master.can
                ? undefined
                : master.hint;

            return (
              <tr key={thread.id}>
                <td data-label="Brand" className={tableStyles.strong}>
                  {thread.brand}
                </td>
                <td
                  data-label="Ticket"
                  className={`${tableStyles.right} ${tableStyles.mono} ${tableStyles.strong}`}
                >
                  <Num value={thread.ticket} />
                </td>
                <td data-label="Composition">{thread.composition}</td>
                <td data-label="Colour">{thread.colour}</td>
                <td data-label="Cone yield m" className={`${tableStyles.right} ${tableStyles.mono}`}>
                  <Num value={thread.coneYieldM} />
                </td>
                <td data-label="Unit price" className={`${tableStyles.right} ${tableStyles.mono}`}>
                  ${thread.unitPrice.toFixed(2)}
                </td>
                <td data-label="Usage" className={tableStyles.soft}>
                  {thread.usage.styles === 0 ? (
                    'not used'
                  ) : (
                    <>
                      <Num value={thread.usage.styles} /> styles
                    </>
                  )}
                </td>
                <td>
                  <div className={styles.rowActions}>
                    <button
                      type="button"
                      className={styles.action}
                      disabled={!master.can}
                      aria-disabled={!master.can || undefined}
                      {...(master.can ? {} : { title: master.hint })}
                      onClick={() => {
                        setEditing(thread);
                        setDraft(toDraft(thread));
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
                      onClick={() => remove.mutate(thread)}
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
        noun="threads"
        onPage={setPage}
        onLimit={(next) => {
          setLimit(next);
          setPage(1);
        }}
      />

      <FootNote>
        {master.can ? '' : `${master.hint}. `}A thread cannot be deleted while it is assigned to an
        operation. Threads can also be created inline from any thread position on an operation.
      </FootNote>
    </Screen>
  );
}
