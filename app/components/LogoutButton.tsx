import { logout } from "@/app/logout/actions";

export default function LogoutButton() {
  return (
    <form action={logout}>
      <button
        type="submit"
        className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm text-zinc-600 transition-all hover:bg-zinc-100 active:scale-95 dark:border-white/10 dark:text-zinc-400 dark:hover:bg-white/10"
      >
        ログアウト
      </button>
    </form>
  );
}
