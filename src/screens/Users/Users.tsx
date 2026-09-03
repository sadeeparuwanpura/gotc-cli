import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ApiError } from '../../api/client';
import { createUser, deleteUser, fetchUsers, updateUser } from '../../api/endpoints';
import { queryKeys } from '../../api/queryKeys';
import { usePermission, useRolePermissions } from '../../auth/usePermission';
import { Button } from '../../components/Button';
import { DataTable, SkeletonRows, tableStyles } from '../../components/DataTable';
import { Field, FormPanel, fieldStyles } from '../../components/Field';
import { ErrorNotice, Notice } from '../../components/Notice';
import { DEFAULT_PAGE_SIZE, Pagination } from '../../components/Pagination';
import { FootNote, Screen, ScreenHeader } from '../../components/Screen';
import { ROLES, type Role } from '../../api/types';
import listStyles from '../../components/ListFilter.module.css';
import styles from './Users.module.css';

interface NewUserDraft {
  name: string;
  email: string;
  role: Role;
}

const BLANK: NewUserDraft = { name: '', email: '', role: 'GARMENT_TECH' };

export function Users(): JSX.Element {
  const queryClient = useQueryClient();
  const gate = usePermission('users');

  const [draft, setDraft] = useState<NewUserDraft | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState<number>(DEFAULT_PAGE_SIZE);
  const [search, setSearch] = useState('');

  const users = useQuery({
    queryKey: queryKeys.users(page, search, limit),
    queryFn: ({ signal }) => fetchUsers({ page, limit, q: search }, signal),
    placeholderData: keepPreviousData
  });
  const matrix = useRolePermissions();

  const roleLabel = (role: Role): string =>
    matrix.data?.find((row) => row.role === role)?.roleLabel ?? role;

  function refreshUsers(): void {
    void queryClient.invalidateQueries({ queryKey: queryKeys.allUsers });
    void queryClient.invalidateQueries({ queryKey: queryKeys.permissions });
  }

  const create = useMutation({
    mutationFn: (input: NewUserDraft) => createUser(input),
    onSuccess: (user) => {
      setNotice(`${user.name} added as ${user.roleLabel}.`);
      setDraft(null);
      setError('');
      refreshUsers();
    },
    onError: (caught: unknown) => {
      setError(caught instanceof ApiError ? caught.message : 'The user could not be created.');
    }
  });

  const changeRole = useMutation({
    mutationFn: (input: { id: string; role: Role }) => updateUser(input.id, { role: input.role }),
    onSuccess: (user) => {
      setNotice(`${user.name} moved to ${user.roleLabel}.`);
      refreshUsers();
    },
    onError: (caught: unknown) => {
      setNotice(caught instanceof ApiError ? caught.message : 'The role could not be changed.');
    }
  });

  const remove = useMutation({
    mutationFn: (input: { id: string; name: string }) => deleteUser(input.id),
    onSuccess: (_result, input) => {
      setNotice(`${input.name} removed.`);
      refreshUsers();
    },
    onError: (caught: unknown) => {
      // "<name> is the last admin. Promote another user first."
      setNotice(caught instanceof ApiError ? caught.message : 'The user could not be removed.');
    }
  });

  const rows = users.data?.items ?? [];
  const total = users.data?.total ?? 0;
  const showSkeleton = users.isLoading && users.data === undefined;
  const adminCount = rows.filter((user) => user.role === 'ADMIN' && user.active).length;

  return (
    <Screen>
      <ScreenHeader
        title="Users"
        subline={gate.can ? undefined : gate.hint}
        actions={
          <Button
            variant="ink"
            onClick={() => {
              setDraft(BLANK);
              setError('');
            }}
            {...gate.lock}
          >
            + New user
          </Button>
        }
      />

      {notice ? <Notice variant="success">{notice}</Notice> : null}
      <ErrorNotice error={users.error} />

      {draft ? (
        <FormPanel
          title="New user"
          error={error}
          actions={
            <>
              <Button variant="ink" onClick={() => create.mutate(draft)} disabled={create.isPending}>
                Create user
              </Button>
              <Button
                onClick={() => {
                  setDraft(null);
                  setError('');
                }}
              >
                Cancel
              </Button>
            </>
          }
        >
          <div className={styles.formGrid}>
            <Field label="Full name" htmlFor="user-name">
              <input
                id="user-name"
                className={fieldStyles.input}
                value={draft.name}
                onChange={(event) => setDraft({ ...draft, name: event.target.value })}
              />
            </Field>
            <Field label="Email" htmlFor="user-email">
              <input
                id="user-email"
                className={`${fieldStyles.input} ${fieldStyles.mono}`}
                value={draft.email}
                onChange={(event) => setDraft({ ...draft, email: event.target.value })}
              />
            </Field>
            <Field label="Role group" htmlFor="user-role">
              <select
                id="user-role"
                className={fieldStyles.select}
                value={draft.role}
                onChange={(event) => setDraft({ ...draft, role: event.target.value as Role })}
              >
                {ROLES.map((role) => (
                  <option key={role} value={role}>
                    {roleLabel(role)}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </FormPanel>
      ) : null}

      <div className={listStyles.filterBar}>
        <input
          className={listStyles.searchInput}
          placeholder="Search name or email"
          aria-label="Search name or email"
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
            <th>Name</th>
            <th>Email</th>
            <th>Role group</th>
            <th>Activity</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {showSkeleton ? <SkeletonRows rows={4} columns={5} /> : null}

          {rows.map((user) => {
            const isLastAdmin = user.role === 'ADMIN' && adminCount === 1;
            const removeHint = isLastAdmin
              ? `${user.name} is the last admin. Promote another user first.`
              : gate.can
                ? undefined
                : gate.hint;

            return (
              <tr key={user.id}>
                <td className={tableStyles.strong}>{user.name}</td>
                <td className={`${tableStyles.mono} ${tableStyles.soft}`}>{user.email}</td>
                <td>
                  <select
                    className={`${fieldStyles.select} ${styles.roleSelect}`}
                    value={user.role}
                    disabled={!gate.can}
                    aria-disabled={!gate.can || undefined}
                    aria-label={`Role group for ${user.name}`}
                    {...(gate.can ? {} : { title: gate.hint })}
                    onChange={(event) =>
                      changeRole.mutate({ id: user.id, role: event.target.value as Role })
                    }
                  >
                    {ROLES.map((role) => (
                      <option key={role} value={role}>
                        {roleLabel(role)}
                      </option>
                    ))}
                  </select>
                </td>
                <td className={tableStyles.soft}>
                  {user.activity.created === 0 && user.activity.approved === 0 ? (
                    'no orders yet'
                  ) : (
                    <>
                      <span className={tableStyles.mono}>{user.activity.created}</span> created ·{' '}
                      <span className={tableStyles.mono}>{user.activity.approved}</span> approved
                    </>
                  )}
                </td>
                <td className={tableStyles.right}>
                  <button
                    type="button"
                    className={`${styles.remove} ${!gate.can || isLastAdmin ? styles.removeLocked : ''}`}
                    disabled={!gate.can || isLastAdmin}
                    aria-disabled={!gate.can || isLastAdmin || undefined}
                    {...(removeHint ? { title: removeHint } : {})}
                    onClick={() => remove.mutate({ id: user.id, name: user.name })}
                  >
                    Remove
                  </button>
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
        noun="users"
        onPage={setPage}
        onLimit={(next) => {
          setLimit(next);
          setPage(1);
        }}
      />

      <FootNote>
        Role groups and what each one may edit live on the Roles &amp; permissions screen.
      </FootNote>
    </Screen>
  );
}
