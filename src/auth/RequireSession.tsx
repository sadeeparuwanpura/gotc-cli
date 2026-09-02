import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useSession } from './SessionProvider';

/** Route guard: a 401 on boot sends you to /login, and back here once signed in. */
export function RequireSession(): JSX.Element {
  const { user, isLoading } = useSession();
  const location = useLocation();

  if (isLoading) {
    // Deliberately blank: no page transitions, no motion on load.
    return <div />;
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}
