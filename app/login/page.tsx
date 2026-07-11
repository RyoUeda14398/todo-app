"use client";

import { useActionState } from "react";
import Link from "next/link";
import { login, type LoginState } from "./actions";

const initialState: LoginState = { error: null };

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(login, initialState);

  return (
    <div className="flex flex-1 items-center justify-center bg-gradient-to-b from-zinc-100 via-zinc-100 to-indigo-50 p-6 dark:from-black dark:via-indigo-950/25 dark:to-black">
      <div className="w-full max-w-sm rounded-3xl border-2 border-indigo-200/70 bg-gradient-to-br from-white via-indigo-50/50 to-violet-50/70 p-8 shadow-[0_25px_60px_-20px_rgba(99,102,241,0.35)] backdrop-blur-2xl dark:border-indigo-400/40 dark:bg-gradient-to-br dark:from-zinc-900/80 dark:via-zinc-950/80 dark:to-indigo-950/40 dark:shadow-[0_0_50px_-12px_rgba(99,102,241,0.45),inset_0_1px_0_0_rgba(255,255,255,0.06)]">
        <h1 className="mb-8 text-3xl font-black tracking-tight text-zinc-900 sm:text-4xl dark:text-zinc-50">
          📝 ログイン
        </h1>

        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="email" className="text-sm text-zinc-600 dark:text-zinc-400">
              メールアドレス
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-zinc-900 transition-colors focus:border-indigo-500 focus:outline-none dark:border-white/15 dark:bg-white/5 dark:text-zinc-50 dark:hover:border-white/25"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="password" className="text-sm text-zinc-600 dark:text-zinc-400">
              パスワード
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-zinc-900 transition-colors focus:border-indigo-500 focus:outline-none dark:border-white/15 dark:bg-white/5 dark:text-zinc-50 dark:hover:border-white/25"
            />
          </div>

          {state.error && (
            <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="mt-2 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 px-6 py-3.5 text-base font-semibold text-white shadow-[0_0_20px_-4px_rgba(99,102,241,0.6)] transition-all hover:-translate-y-0.5 hover:shadow-[0_0_30px_-4px_rgba(99,102,241,0.8)] active:translate-y-0 active:scale-95 disabled:opacity-50 dark:shadow-[0_0_20px_-4px_rgba(129,140,248,0.6)] dark:hover:shadow-[0_0_30px_-4px_rgba(129,140,248,0.8)]"
          >
            {pending ? "ログイン中..." : "ログイン"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-zinc-500 dark:text-zinc-400">
          アカウントをお持ちでない方は{" "}
          <Link href="/signup" className="font-medium text-indigo-600 underline dark:text-indigo-400">
            新規登録
          </Link>
        </p>
      </div>
    </div>
  );
}
