"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signup, type SignupState } from "./actions";

const initialState: SignupState = { error: null, success: false };

export default function SignupPage() {
  const [state, formAction, pending] = useActionState(signup, initialState);

  return (
    <div className="flex flex-1 items-center justify-center bg-gradient-to-b from-zinc-100 via-zinc-100 to-indigo-50 p-6 dark:from-black dark:via-black dark:to-indigo-950/30">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white/80 p-6 shadow-sm backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-950/80">
        <h1 className="mb-6 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          📝 新規登録
        </h1>

        {state.success ? (
          <p className="text-zinc-700 dark:text-zinc-300">
            確認メールを送信しました。メール内のリンクを開いて登録を完了してから、
            <Link href="/login" className="font-medium text-indigo-600 underline dark:text-indigo-400">
              ログイン
            </Link>
            してください。
          </p>
        ) : (
          <>
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
                  className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 focus:border-indigo-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor="password" className="text-sm text-zinc-600 dark:text-zinc-400">
                  パスワード(6文字以上)
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  minLength={6}
                  className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 focus:border-indigo-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                />
              </div>

              {state.error && (
                <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>
              )}

              <button
                type="submit"
                disabled={pending}
                className="mt-2 rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {pending ? "登録中..." : "登録"}
              </button>
            </form>

            <p className="mt-4 text-center text-sm text-zinc-500 dark:text-zinc-400">
              すでにアカウントをお持ちの方は{" "}
              <Link href="/login" className="font-medium text-indigo-600 underline dark:text-indigo-400">
                ログイン
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
