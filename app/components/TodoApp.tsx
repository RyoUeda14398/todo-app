"use client";

import { startTransition, useActionState, useState } from "react";
import TodoItem, { type Todo, type TodoStatus } from "@/app/components/TodoItem";
import { addTodoFromText, type AddTodoFromTextState } from "@/app/todos/ai-actions";
import { TODO_COLORS } from "@/lib/todoColors";

type TodoAppProps = {
  todos: Todo[];
  onAdd: (formData: FormData) => void | Promise<void>;
  onStatusChange: (id: string, status: TodoStatus) => void;
  onEdit: (id: string) => void;
};

function formatDueDate(dueDate: string, dueTime?: string | null) {
  const [year, month, day] = dueDate.split("-");
  return dueTime ? `${year}/${month}/${day} ${dueTime}` : `${year}/${month}/${day}`;
}

const initialAiState: AddTodoFromTextState = { error: null, lastResult: null };

export default function TodoApp({ todos, onAdd, onStatusChange, onEdit }: TodoAppProps) {
  const [activeTab, setActiveTab] = useState<"manual" | "ai">("manual");
  const [aiState, aiFormAction, aiPending] = useActionState(
    addTodoFromText,
    initialAiState
  );
  const [manualPending, setManualPending] = useState(false);

  // A plain onSubmit handler (rather than the `action` prop) is used here on
  // purpose: React automatically resets a form again on its own once an
  // `action` function's promise settles, and that second, delayed reset
  // could wipe out text the user has since started typing for their next
  // task. Handling submit ourselves keeps reset timing fully in our control.
  function handleManualSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    e.currentTarget.reset();
    setManualPending(true);
    // onAdd applies an optimistic update internally, which React requires to
    // happen inside a transition (the `action` prop provided this
    // automatically; a plain onSubmit handler doesn't, so it's done here).
    startTransition(() => {
      Promise.resolve(onAdd(formData)).finally(() => setManualPending(false));
    });
  }

  const remainingCount = todos.filter((todo) => todo.status !== "completed").length;

  return (
    <div className="w-full rounded-3xl border-2 border-indigo-200/70 bg-gradient-to-br from-white via-indigo-50/50 to-violet-50/70 p-8 shadow-[0_25px_60px_-20px_rgba(99,102,241,0.35)] backdrop-blur-2xl sm:p-10 dark:border-indigo-400/40 dark:bg-gradient-to-br dark:from-zinc-900/80 dark:via-zinc-950/80 dark:to-indigo-950/40 dark:shadow-[0_0_50px_-12px_rgba(99,102,241,0.45),inset_0_1px_0_0_rgba(255,255,255,0.06)]">
      <h1 className="mb-8 text-4xl font-black tracking-tight text-zinc-900 sm:text-5xl dark:text-zinc-50">
        ToDoリスト
      </h1>

      <div className="mb-6 flex gap-1 rounded-xl bg-zinc-100 p-1 dark:bg-white/5">
        <button
          type="button"
          onClick={() => setActiveTab("manual")}
          className={`flex-1 rounded-lg px-3 py-2.5 text-sm font-semibold transition-all ${
            activeTab === "manual"
              ? "bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-[0_0_20px_-4px_rgba(99,102,241,0.7)]"
              : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
          }`}
        >
          手入力
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("ai")}
          className={`flex-1 rounded-lg px-3 py-2.5 text-sm font-semibold transition-all ${
            activeTab === "ai"
              ? "bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-[0_0_20px_-4px_rgba(99,102,241,0.7)]"
              : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
          }`}
        >
          ✨ AIにおまかせ
        </button>
      </div>

      {activeTab === "manual" ? (
        <form onSubmit={handleManualSubmit} className="mb-4 flex flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            <input
              type="text"
              name="text"
              required
              placeholder="やることを入力..."
              className="min-w-0 flex-1 rounded-xl border border-zinc-300 bg-white px-3 py-2 text-zinc-900 placeholder:text-zinc-400 transition-colors focus:border-indigo-500 focus:outline-none dark:border-white/15 dark:bg-white/5 dark:text-zinc-50 dark:hover:border-white/25"
            />
            <input
              type="date"
              name="due_date"
              aria-label="締切日(任意)"
              className="rounded-xl border border-zinc-300 bg-white px-2 py-2 text-sm text-zinc-900 transition-colors focus:border-indigo-500 focus:outline-none dark:border-white/15 dark:bg-white/5 dark:text-zinc-50 dark:hover:border-white/25 dark:[color-scheme:dark]"
            />
            <input
              type="time"
              name="due_time"
              aria-label="締切時刻(任意)"
              className="rounded-xl border border-zinc-300 bg-white px-2 py-2 text-sm text-zinc-900 transition-colors focus:border-indigo-500 focus:outline-none dark:border-white/15 dark:bg-white/5 dark:text-zinc-50 dark:hover:border-white/25 dark:[color-scheme:dark]"
            />
            <button
              type="submit"
              disabled={manualPending}
              className="rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 px-6 py-3.5 text-base font-semibold text-white shadow-[0_0_20px_-4px_rgba(99,102,241,0.6)] transition-all hover:-translate-y-0.5 hover:shadow-[0_0_30px_-4px_rgba(99,102,241,0.8)] active:translate-y-0 active:scale-95 disabled:opacity-50 dark:shadow-[0_0_20px_-4px_rgba(129,140,248,0.6)] dark:hover:shadow-[0_0_30px_-4px_rgba(129,140,248,0.8)]"
            >
              {manualPending ? "追加中..." : "追加"}
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2 px-1">
            <span className="text-xs text-zinc-400 dark:text-zinc-500">色(任意):</span>
            {TODO_COLORS.map((c) => (
              <label key={c.value} className="cursor-pointer">
                <input type="radio" name="color" value={c.value} className="peer sr-only" />
                <span
                  aria-label={c.label}
                  title={c.label}
                  className={`block h-6 w-6 rounded-full ring-offset-2 ring-offset-white transition-all hover:scale-110 peer-checked:ring-2 peer-checked:ring-zinc-900 dark:ring-offset-zinc-950 dark:peer-checked:ring-white ${c.dot}`}
                />
              </label>
            ))}
          </div>
        </form>
      ) : (
        <form action={aiFormAction} className="mb-4 flex flex-col gap-2">
          <textarea
            name="raw_text"
            required
            rows={2}
            placeholder="例: 明日の18時までに買い物する"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                e.currentTarget.form?.requestSubmit();
              }
            }}
            className="w-full resize-none rounded-xl border border-zinc-300 bg-white px-3 py-2 text-zinc-900 placeholder:text-zinc-400 transition-colors focus:border-indigo-500 focus:outline-none dark:border-white/15 dark:bg-white/5 dark:text-zinc-50 dark:hover:border-white/25"
          />
          <button
            type="submit"
            disabled={aiPending}
            className="self-end rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 px-6 py-3.5 text-base font-semibold text-white shadow-lg shadow-indigo-600/40 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-indigo-600/50 active:translate-y-0 active:scale-95 disabled:opacity-50 dark:shadow-indigo-500/50 dark:hover:shadow-violet-500/60"
          >
            {aiPending ? "考え中..." : "AIで登録"}
          </button>
          {aiState.error && (
            <p className="text-sm text-red-600 dark:text-red-400">
              {aiState.error}
            </p>
          )}
          {aiState.lastResult && (
            <p className="text-sm text-indigo-600 dark:text-indigo-400">
              「{aiState.lastResult.task}」を登録しました
              {aiState.lastResult.due_date &&
                `(締切: ${formatDueDate(aiState.lastResult.due_date, aiState.lastResult.due_time)})`}
            </p>
          )}
        </form>
      )}

      {todos.length === 0 ? (
        <p className="py-8 text-center text-zinc-400 dark:text-zinc-600">
          まだToDoがありません
        </p>
      ) : (
        <>
          <ul className="flex flex-col gap-3">
            {todos.map((todo) => (
              <TodoItem
                key={todo.id}
                todo={todo}
                onStatusChange={onStatusChange}
                onEdit={onEdit}
              />
            ))}
          </ul>
          <p className="mt-6 text-sm font-medium text-zinc-500 dark:text-zinc-400">
            残り <span className="text-base font-bold text-indigo-600 dark:text-indigo-400">{remainingCount}</span> / {todos.length} 件
          </p>
        </>
      )}
    </div>
  );
}
