import { Link } from 'react-router-dom';
import { LogOut, LayoutGrid } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import { logout } from '../features/auth/authSlice';
import { useLogoutApiMutation } from '../services/api';
import { disconnectSocket } from '../lib/socket';
import SearchBox from './SearchBox';
import Avatar from './Avatar';

export default function Navbar() {
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const [logoutApi] = useLogoutApiMutation();

  const onLogout = async () => {
    disconnectSocket();
    await logoutApi().catch(() => {});
    dispatch(logout());
  };

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link to="/" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-white">
            <LayoutGrid size={18} />
          </span>
          <span className="font-display text-lg font-semibold tracking-tight">Taskboard</span>
        </Link>

        <div className="flex items-center gap-3">
          <SearchBox className="hidden w-64 sm:block" />
          {user && (
            <div className="flex items-center gap-2">
              <Avatar name={user.name} />
              <span className="hidden text-sm font-medium md:inline">{user.name}</span>
              <button
                onClick={onLogout}
                className="cursor-pointer rounded-md p-2 text-muted hover:bg-canvas hover:text-ink"
                aria-label="Log out"
                title="Log out"
              >
                <LogOut size={18} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Search drops to its own row on mobile */}
      <div className="px-4 pb-3 sm:hidden">
        <SearchBox />
      </div>
    </header>
  );
}
