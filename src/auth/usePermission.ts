import { useQuery } from '@tanstack/react-query';
import { fetchRolePermissions } from '../api/endpoints';
import { queryKeys } from '../api/queryKeys';
import type { Permission } from '../api/types';
import { joinWithOr } from '../lib/format';
import { useSession } from './SessionProvider';

export interface PermissionGate {
  can: boolean;
  /** "Garment technician can edit this" — empty when the user may edit. */
  hint: string;
  /** Spread onto a control so it disables with the right explanation. */
  lock: { disabled: true; title: string } | { disabled: false };
}

/**
 * Permission-locked controls are disabled, not hidden, and their `title` explains who may
 * edit. The sentence is computed from the live matrix — never hard-coded — so granting a
 * permission changes the hint everywhere at once.
 */
export function usePermission(permission: Permission): PermissionGate {
  const { permissions } = useSession();

  const matrix = useQuery({
    queryKey: queryKeys.permissions,
    queryFn: ({ signal }) => fetchRolePermissions(signal),
    staleTime: 5 * 60 * 1000
  });

  const can = permissions?.[permission] ?? false;
  if (can) {
    return { can: true, hint: '', lock: { disabled: false } };
  }

  const holders = (matrix.data ?? [])
    .filter((row) => row.permissions[permission])
    .map((row) => row.roleLabel);

  const hint = holders.length > 0 ? `${joinWithOr(holders)} can edit this` : 'No role can edit this';

  return { can: false, hint, lock: { disabled: true, title: hint } };
}

/** The whole matrix, for the users screen and any hint that needs every row. */
export function useRolePermissions() {
  return useQuery({
    queryKey: queryKeys.permissions,
    queryFn: ({ signal }) => fetchRolePermissions(signal),
    staleTime: 5 * 60 * 1000
  });
}
