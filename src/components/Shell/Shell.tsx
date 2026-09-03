import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useSession } from '../../auth/SessionProvider';
import {
  fetchFabrics,
  fetchGarments,
  fetchMachineTypes,
  fetchOrders,
  fetchThreads,
  fetchUsers
} from '../../api/endpoints';
import { queryKeys } from '../../api/queryKeys';
import { ROLES } from '../../api/types';
import { initials } from '../../lib/format';
import styles from './Shell.module.css';

interface NavItem {
  label: string;
  path: string;
  count: number | null;
  /** Extra routes that keep this item lit — Garments stays active on the detail screens. */
  matches: string[];
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

export function Shell(): JSX.Element {
  const { user, signOut } = useSession();
  const navigate = useNavigate();
  const location = useLocation();

  /**
   * Below the tablet breakpoint the sidebar leaves the flow and becomes a drawer. Above it
   * the CSS ignores this flag entirely, so the desktop shell is unchanged.
   */
  const [menuOpen, setMenuOpen] = useState(false);

  // Arriving somewhere new closes the drawer — otherwise it covers the screen you asked for.
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [menuOpen]);

  // The sidebar wants totals, not rows: ask for the smallest possible page.
  const garments = useQuery({
    queryKey: queryKeys.garments(1, '', 1),
    queryFn: ({ signal }) => fetchGarments({ page: 1, limit: 1 }, signal)
  });
  const orders = useQuery({
    queryKey: queryKeys.orders('All', '', 1),
    queryFn: ({ signal }) => fetchOrders({ page: 1, limit: 1 }, signal)
  });
  const threads = useQuery({
    queryKey: queryKeys.threads(1, '', 1),
    queryFn: ({ signal }) => fetchThreads({ page: 1, limit: 1 }, signal)
  });
  const machineTypes = useQuery({
    queryKey: queryKeys.machineTypes(1, '', 1),
    queryFn: ({ signal }) => fetchMachineTypes({ page: 1, limit: 1 }, signal)
  });
  const fabrics = useQuery({
    queryKey: queryKeys.fabrics(1, '', 1),
    queryFn: ({ signal }) => fetchFabrics({ page: 1, limit: 1 }, signal)
  });
  const users = useQuery({
    queryKey: queryKeys.users(1, '', 1),
    queryFn: ({ signal }) => fetchUsers({ page: 1, limit: 1 }, signal)
  });

  const groups: NavGroup[] = [
    {
      label: 'PLANNING',
      items: [
        {
          label: 'Garments',
          path: '/garments',
          count: garments.data?.total ?? null,
          matches: ['/garments']
        },
        {
          label: 'Cone orders',
          path: '/orders',
          count: orders.data?.total ?? null,
          matches: ['/orders']
        }
      ]
    },
    {
      label: 'MASTER DATA',
      items: [
        { label: 'Threads', path: '/threads', count: threads.data?.total ?? null, matches: ['/threads'] },
        {
          label: 'Machine types',
          path: '/machine-types',
          count: machineTypes.data?.total ?? null,
          matches: ['/machine-types']
        },
        { label: 'Fabrics', path: '/fabrics', count: fabrics.data?.total ?? null, matches: ['/fabrics'] }
      ]
    },
    {
      label: 'ADMINISTRATION',
      items: [
        { label: 'Users', path: '/users', count: users.data?.total ?? null, matches: ['/users'] },
        {
          label: 'Roles & permissions',
          path: '/roles',
          // The four role groups are fixed by the domain, so this count is a constant.
          count: ROLES.length,
          matches: ['/roles']
        }
      ]
    }
  ];

  const isActive = (item: NavItem): boolean =>
    item.matches.some((prefix) => location.pathname.startsWith(prefix));

  return (
    <>
      <header className={styles.topBar}>
        <button
          type="button"
          className={styles.menuButton}
          aria-label={menuOpen ? 'Close the section menu' : 'Open the section menu'}
          aria-expanded={menuOpen}
          aria-controls="gotc-sidebar"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span className={styles.menuBars} />
        </button>

        <div className={styles.brand}>
          <span className={styles.mark}>G</span>
          <div>
            <div className={styles.wordmark}>GOTC</div>
            <div className={styles.tagline}>Garment thread planning</div>
          </div>
        </div>
        {user ? (
          <div className={styles.identity}>
            <span className={styles.identityName}>{user.name}</span>
            <span className={styles.identityRole}>{user.roleLabel}</span>
          </div>
        ) : null}
      </header>

      <button
        type="button"
        aria-hidden="true"
        tabIndex={-1}
        className={`${styles.scrim} ${menuOpen ? styles.scrimVisible : ''}`}
        onClick={() => setMenuOpen(false)}
      />

      <nav
        id="gotc-sidebar"
        className={`${styles.sidebar} ${menuOpen ? styles.sidebarOpen : ''}`}
        aria-label="Sections"
      >
        {groups.map((group) => (
          <div key={group.label} className={styles.group}>
            <div className={styles.groupLabel}>{group.label}</div>
            {group.items.map((item) => {
              const active = isActive(item);
              return (
                <button
                  key={item.path}
                  type="button"
                  className={`${styles.item} ${active ? styles.itemActive : ''}`}
                  aria-current={active ? 'page' : undefined}
                  onClick={() => navigate(item.path)}
                >
                  <span>{item.label}</span>
                  <span className={styles.count}>{item.count ?? ''}</span>
                </button>
              );
            })}
          </div>
        ))}

        <div className={styles.readNote}>
          Editing rights follow your role. Everyone can read every screen.
        </div>

        {user ? (
          <div className={styles.footer}>
            <div className={styles.footerUser}>
              <span className={styles.avatar}>{initials(user.name)}</span>
              <div className={styles.footerText}>
                <div className={styles.footerName} title={user.name}>
                  {user.name}
                </div>
                <div className={styles.footerRole} title={user.roleLabel}>
                  {user.roleLabel}
                </div>
              </div>
            </div>
            <button
              type="button"
              className={styles.signOut}
              onClick={() => {
                void signOut().then(() => navigate('/login', { replace: true }));
              }}
            >
              <span className={styles.glyph}>→]</span>Sign out
            </button>
          </div>
        ) : null}
      </nav>

      <main className={styles.content}>
        <Outlet />
      </main>
    </>
  );
}
