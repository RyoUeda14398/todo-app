import { logout } from "@/app/logout/actions";

export default function LogoutButton() {
  return (
    <form action={logout}>
      <button
        type="submit"
        className="flex items-center gap-1.5 rounded-full border border-indigo-200/60 bg-white/50 px-3.5 py-2 text-sm font-medium text-zinc-600 backdrop-blur-md transition-all hover:border-red-300 hover:text-red-600 hover:shadow-[0_0_16px_-2px_rgba(239,68,68,0.4)] active:scale-95 dark:border-indigo-400/20 dark:bg-white/5 dark:text-zinc-300 dark:hover:border-red-400/40 dark:hover:text-red-400"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
        <span className="hidden sm:inline">ログアウト</span>
      </button>
    </form>
  );
}
