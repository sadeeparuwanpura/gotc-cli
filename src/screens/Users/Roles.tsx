import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ApiError } from '../../api/client';
import { updateRolePermissions } from '../../api/endpoints';
import { queryKeys } from '../../api/queryKeys';
import { useSession } from '../../auth/SessionProvider';
import { usePermission, useRolePermissions } from '../../auth/usePermission';
import { DataTable, SkeletonRows } from '../../components/DataTable';
import { ErrorNotice, Notice } from '../../components/Notice';
import { FootNote, Screen, ScreenHeader } from '../../components/Screen';
import { PERMISSIONS, type Permission, type Role } from '../../api/types';
import styles from './Roles.module.css';

/** Sub-labels under each permission row, from README.md §Roles and permissions. */
export const PERMISSION_LABELS: Record<Permission, { label: string; sub: string }> = {
  info: { label: 'Garment information', sub: 'Style, buyer, quantity, wastage' },
  fabrics: { label: 'Fabrics', sub: 'Library CRUD and part assignment' },
  operations: { label: 'Operations and threads', sub: 'Sequence, machine, seam, thread positions' },
  master: { label: 'Master data', sub: 'Thread library and machine types' },
  orders: { label: 'Create cone orders', sub: 'Generate an order from a garment' },
  approve: { label: 'Approve cone orders', sub: 'Approve, reject, mark as ordered' },
  users: { label: 'Users and permissions', sub: 'Accounts, role groups, this table' }
};

export function Roles(): JSX.Element {
  const queryClient = useQueryClient();
  const gate = usePermission('users');
  const { user: me } = useSession();
  const matrix = useRolePermissions();

  const [notice, setNotice] = useState('');

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

  const groups = matrix.data ?? [];
  const showSkeleton = matrix.isLoading && matrix.data === undefined;

  return (
    <Screen>
      <ScreenHeader
        title="Roles & permissions"
        subline={
          gate.can
            ? 'Permissions control editing only — every role reads every screen.'
            : gate.hint
        }
      />

      {notice ? <Notice variant="success">{notice}</Notice> : null}
      <ErrorNotice error={matrix.error} />

      <DataTable>
        <thead>
          <tr>
            <th>Permission</th>
            {groups.map((row) => (
              <th key={row.role} className={styles.roleHead}>
                {row.roleLabel}
                <span className={styles.roleHeadCount}>{row.userCount}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {showSkeleton ? <SkeletonRows rows={7} columns={5} /> : null}

          {!showSkeleton &&
            PERMISSIONS.map((permission) => (
              <tr key={permission}>
                <td>
                  <div className={styles.permissionLabel}>{PERMISSION_LABELS[permission].label}</div>
                  <div className={styles.permissionSub}>{PERMISSION_LABELS[permission].sub}</div>
                </td>
                {groups.map((row) => {
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
                      data-label={row.roleLabel}
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
    </Screen>
  );
}
