"use client";

import { useActionState, useState } from "react";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import TodoItem, { type Todo } from "@/app/components/TodoItem";
import { addTodoFromText, type AddTodoFromTextState } from "@/app/todos/ai-actions";

type TodoAppProps = {
  todos: Todo[];
  onAdd: (formData: FormData) => void | Promise<void>;
  onToggle: (id: string, completed: boolean) => void;
  onDelete: (id: string) => void;
};

function formatDueDate(dueDate: string) {
  const [year, month, day] = dueDate.split("-");
  return `${year}/${month}/${day}`;
}

const initialAiState: AddTodoFromTextState = { error: null, lastResult: null };

export default function TodoApp({ todos, onAdd, onToggle, onDelete }: TodoAppProps) {
  const [activeTab, setActiveTab] = useState<"manual" | "ai">("manual");
  const [aiState, aiFormAction, aiPending] = useActionState(
    addTodoFromText,
    initialAiState
  );

  const remainingCount = todos.filter((todo) => !todo.completed).length;

  return (
    <div className="w-full rounded-3xl border border-zinc-200/80 bg-white/90 p-6 shadow-xl shadow-zinc-200/60 backdrop-blur-md dark:border-white/10 dark:bg-zinc-950/70 dark:shadow-[0_0_40px_-15px_rgba(99,102,241,0.4)]">
      <h1 className="mb-6 text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
        ToDoリスト
      </h1>

      <div className="mb-4 flex gap-4 border-b border-zinc-200 dark:border-white/10">
        <button
          type="button"
          onClick={() => setActiveTab("manual")}
          className={`-mb-px border-b-2 px-1 py-2 text-sm font-medium transition-colors ${
            activeTab === "manual"
              ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
              : "border-transparent text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
          }`}
        >
          手入力
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("ai")}
          className={`-mb-px border-b-2 px-1 py-2 text-sm font-medium transition-colors ${
            activeTab === "ai"
              ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
              : "border-transparent text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
          }`}
        >
          ✨ AIにおまかせ
        </button>
      </div>

      {activeTab === "manual" ? (
        <form action={onAdd} className="mb-4 flex flex-wrap gap-2">
          <input
            type="text"
            name="text"
            required
            placeholder="やることを入力..."
            className="min-w-0 flex-1 rounded-xl border border-zinc-300 bg-white px-3 py-2 text-zinc-900 placeholder:text-zinc-400 transition-colors focus:border-indigo-500 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-zinc-50"
          />
          <input
            type="date"
            name="due_date"
            aria-label="締切日(任意)"
            className="rounded-xl border border-zinc-300 bg-white px-2 py-2 text-sm text-zinc-900 transition-colors focus:border-indigo-500 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-zinc-50 dark:[color-scheme:dark]"
          />
          <button
            type="submit"
            className="rounded-xl bg-indigo-600 px-4 py-2 font-medium text-white shadow-sm shadow-indigo-600/30 transition-all hover:bg-indigo-700 dark:shadow-indigo-500/40 dark:hover:shadow-indigo-500/60 active:scale-95"
          >
            追加
          </button>
        </form>
      ) : (
        <form action={aiFormAction} className="mb-4 flex flex-col gap-2">
          <textarea
            name="raw_text"
            required
            rows={2}
            placeholder="例: 明日の18時までに買い物する"
            className="w-full resize-none rounded-xl border border-zinc-300 bg-white px-3 py-2 text-zinc-900 placeholder:text-zinc-400 transition-colors focus:border-indigo-500 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-zinc-50"
          />
          <button
            type="submit"
            disabled={aiPending}
            className="self-end rounded-xl bg-indigo-600 px-4 py-2 font-medium text-white shadow-sm shadow-indigo-600/30 transition-all hover:bg-indigo-700 dark:shadow-indigo-500/40 dark:hover:shadow-indigo-500/60 active:scale-95 disabled:opacity-50"
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
                `(締切: ${formatDueDate(aiState.lastResult.due_date)})`}
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
          <SortableContext
            items={todos.map((todo) => todo.id)}
            strategy={verticalListSortingStrategy}
          >
            <ul className="flex flex-col gap-2">
              {todos.map((todo) => (
                <TodoItem
                  key={todo.id}
                  todo={todo}
                  onToggle={onToggle}
                  onDelete={onDelete}
                />
              ))}
            </ul>
          </SortableContext>
          <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
            残り {remainingCount} / {todos.length} 件
          </p>
        </>
      )}
    </div>
  );
}
