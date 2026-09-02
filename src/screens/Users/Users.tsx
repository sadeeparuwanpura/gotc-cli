import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ApiError } from '../../api/client';
import {
  createUser,
  deleteUser,
  fetchUsers,
  updateRolePermissions,
  updateUser
} from '../../api/endpoints';
import { queryKeys } from '../../api/queryKeys';
import { useSession } from '../../auth/SessionProvider';
import { usePermission, useRolePermissions } from '../../auth/usePermission';
import { Button } from '../../components/Button';
import { DataTable, SkeletonRows, tableStyles } from '../../components/DataTable';
import { Field, FormPanel, fieldStyles } from '../../components/Field';
import { Notice } from '../../components/Notice';
import { FootNote, Screen, ScreenHeader, SectionHead } from '../../components/Screen';
import { PERMISSIONS, ROLES, type Permission, type Role } from '../../api/types';
import styles from './Users.module.css';

/** Sub-labels under each permission row, from README.md §Roles and permissions. */
const PERMISSION_LABELS: Record<Permission, { label: string; sub: string }> = {
  info: { label: 'Garment information', sub: 'Style, buyer, quantity, wastage' },
  fabrics: { label: 'Fabrics', sub: 'Library CRUD and part assignment' },
  operations: { label: 'Operations and threads', sub: 'Sequence, machine, seam, thread positions' },
  master: { label: 'Master data', sub: 'Thread library and machine types' },
  orders: { label: 'Create cone orders', sub: 'Generate an order from a garment' },
  approve: { label: 'Approve cone orders', sub: 'Approve, reject, mark as ordered' },
  users: { label: 'Users and permissions', sub: 'Accounts, role groups, this table' }
};

interface NewUserDraft {
  name: string;
  email: string;
  role: Role;
}

const BLANK: NewUserDraft = { name: '', email: '', role: 'GARMENT_TECH' };

export function Users(): JSX.Element {
  const queryClient = useQueryClient();
  const gate = usePermission('users');
  const { user: me } = useSession();

  const [draft, setDraft] = useState<NewUserDraft | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const users = useQuery({ queryKey: queryKeys.users, queryFn: ({ signal }) => fetchUsers(signal) });
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

  const togglePermission = useMutation({
    mutationFn: (input: { role: Role; permission: Permission; next: boolean }) =>
      updateRolePermissions(input.role, { [input.permission]: input.next }),
    onSuccess: (row, input) => {
      const label = PERMISSION_LABELS[input.permission].label.toLowerCase();
      setNotice(
        input.next
          ? `Granted ${label} for ${row.roleLabel}.`
          : `Removed ${label} for ${row.roleLabel}.`
      );
      // A permission change alters what this very session may edit elsewhere.
      void queryClient.invalidateQueries({ queryKey: queryKeys.permissions });
      void queryClient.invalidateQueries({ queryKey: queryKeys.session });
    },
    onError: (caught: unknown) => {
      setNotice(
        caught instanceof ApiError ? caught.message : 'The permission could not be changed.'
      );
    }
  });

  const rows = users.data ?? [];
  const adminCount = rows.filter((user) => user.role === 'ADMIN' && user.active).length;

  return (
    <Screen>
      <ScreenHeader
        title="Users & permissions"
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

      <DataTable hoverRows>
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
          {users.isLoading ? <SkeletonRows rows={4} columns={5} /> : null}

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

      <div className={styles.matrix}>
        <SectionHead title="Role permissions" />
        <DataTable>
          <thead>
            <tr>
              <th>Permission</th>
              {(matrix.data ?? []).map((row) => (
                <th key={row.role} className={styles.roleHead}>
                  {row.roleLabel}
                  <span className={styles.roleHeadCount}>{row.userCount}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PERMISSIONS.map((permission) => (
              <tr key={permission}>
                <td>
                  <div className={styles.permissionLabel}>{PERMISSION_LABELS[permission].label}</div>
                  <div className={styles.permissionSub}>{PERMISSION_LABELS[permission].sub}</div>
                </td>
                {(matrix.data ?? []).map((row) => {
                  const isAdminColumn = row.role === 'ADMIN';
                  const isOwnColumn = me?.role === row.role;
                  const locked = isAdminColumn || !gate.can;
                  const title = isAdminColumn
                    ? 'Admin always has every permission'
                    : gate.can
                      ? undefined
                      : gate.hint;

                  return (
                    <td
                      key={row.role}
                      className={`${styles.cell} ${isOwnColumn ? styles.ownColumn : ''}`}
                    >
                      <input
                        type="checkbox"
                        className={styles.checkbox}
                        checked={isAdminColumn ? true : row.permissions[permission]}
                        disabled={locked}
                        aria-disabled={locked || undefined}
                        aria-label={`${PERMISSION_LABELS[permission].label} for ${row.roleLabel}`}
                        {...(title ? { title } : {})}
                        onChange={(event) =>
                          togglePermission.mutate({
                            role: row.role,
                            permission,
                            next: event.target.checked
                          })
                        }
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </DataTable>

        <FootNote>
          Permissions control editing only — every role reads every screen. The Admin group is fixed
          so the system cannot be locked out.
        </FootNote>
      </div>
    </Screen>
  );
}
