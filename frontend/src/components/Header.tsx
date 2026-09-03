import { useAuth } from '../hooks/useAuth';

export default function Header({ onCompose }: { onCompose: () => void }) {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white/80 px-6 py-4 backdrop-blur">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 font-bold text-white">
          E
        </div>
        <span className="text-lg font-semibold text-slate-900">Email Job Scheduler</span>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={onCompose}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-brand-700"
        >
          + Compose New Email
        </button>

        <div className="flex items-center gap-2">
          {user?.avatarUrl ? (
            <img src={user.avatarUrl} alt={user.name} className="h-8 w-8 rounded-full" />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-xs font-medium">
              {user?.name?.[0] ?? '?'}
            </div>
          )}
          <div className="hidden text-sm sm:block">
            <div className="font-medium text-slate-900">{user?.name}</div>
            <div className="text-slate-500">{user?.email}</div>
          </div>
        </div>

        <button
          onClick={logout}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          Logout
        </button>
      </div>
    </header>
  );
}
