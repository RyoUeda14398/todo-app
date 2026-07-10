"use client";

import { useActionState, useOptimistic, useState } from "react";
import TodoItem, { type Todo } from "@/app/components/TodoItem";
import { addTodo } from "@/app/todos/actions";
import { addTodoFromText, type AddTodoFromTextState } from "@/app/todos/ai-actions";

type TodoAppProps = {
  todos: Todo[];
};

type OptimisticAction =
  | { type: "add"; todo: Todo }
  | { type: "toggle"; id: string; completed: boolean }
  | { type: "delete"; id: string };

function todosReducer(state: Todo[], action: OptimisticAction): Todo[] {
  switch (action.type) {
    case "add":
      return [...state, action.todo];
    case "toggle":
      return state.map((todo) =>
        todo.id === action.id ? { ...todo, completed: action.completed } : todo
      );
    case "delete":
      return state.filter((todo) => todo.id !== action.id);
    default:
      return state;
  }
}

function formatDueDate(dueDate: string) {
  const [year, month, day] = dueDate.split("-");
  return `${year}/${month}/${day}`;
}

const initialAiState: AddTodoFromTextState = { error: null, lastResult: null };

export default function TodoApp({ todos }: TodoAppProps) {
  const [optimisticTodos, applyOptimisticUpdate] = useOptimistic(
    todos,
    todosReducer
  );
  const [activeTab, setActiveTab] = useState<"manual" | "ai">("manual");
  const [aiState, aiFormAction, aiPending] = useActionState(
    addTodoFromText,
    initialAiState
  );

  async function handleAdd(formData: FormData) {
    const text = String(formData.get("text") ?? "").trim();
    if (!text) return;

    const dueDate = String(formData.get("due_date") ?? "").trim();

    applyOptimisticUpdate({
      type: "add",
      todo: {
        id: crypto.randomUUID(),
        text,
        completed: false,
        due_date: dueDate || null,
      },
    });
    await addTodo(formData);
  }

  function handleToggle(id: string, completed: boolean) {
    applyOptimisticUpdate({ type: "toggle", id, completed });
  }

  function handleDelete(id: string) {
    applyOptimisticUpdate({ type: "delete", id });
  }

  const remainingCount = optimisticTodos.filter(
    (todo) => !todo.completed
  ).length;

  return (
    <div className="w-full rounded-2xl border border-zinc-200 bg-white/80 p-6 shadow-sm backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-950/80">
      <h1 className="mb-6 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        ToDoリスト
      </h1>

      <div className="mb-4 flex gap-4 border-b border-zinc-200 dark:border-zinc-800">
        <button
          type="button"
          onClick={() => setActiveTab("manual")}
          className={`-mb-px border-b-2 px-1 py-2 text-sm font-medium ${
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
          className={`-mb-px border-b-2 px-1 py-2 text-sm font-medium ${
            activeTab === "ai"
              ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
              : "border-transparent text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
          }`}
        >
          ✨ AIにおまかせ
        </button>
      </div>

      {activeTab === "manual" ? (
        <form action={handleAdd} className="mb-4 flex flex-wrap gap-2">
          <input
            type="text"
            name="text"
            required
            placeholder="やることを入力..."
            className="min-w-0 flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 placeholder:text-zinc-400 focus:border-indigo-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          />
          <input
            type="date"
            name="due_date"
            aria-label="締切日(任意)"
            className="rounded-lg border border-zinc-300 bg-white px-2 py-2 text-sm text-zinc-900 focus:border-indigo-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          />
          <button
            type="submit"
            className="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700"
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
            className="w-full resize-none rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 placeholder:text-zinc-400 focus:border-indigo-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          />
          <button
            type="submit"
            disabled={aiPending}
            className="self-end rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {aiPending ? "考え中..." : "AIで登録"}
          </button>
          {aiState.error && (
            <p className="text-sm text-red-600 dark:text-red-400">
              {aiState.error}
            </p>
          )}
          {aiState.lastResult && (
            <p className="text-sm text-emerald-600 dark:text-emerald-400">
              「{aiState.lastResult.task}」を登録しました
              {aiState.lastResult.due_date &&
                `(締切: ${formatDueDate(aiState.lastResult.due_date)})`}
            </p>
          )}
        </form>
      )}

      {optimisticTodos.length === 0 ? (
        <p className="py-8 text-center text-zinc-400 dark:text-zinc-600">
          まだToDoがありません
        </p>
      ) : (
        <>
          <ul className="flex flex-col gap-2">
            {optimisticTodos.map((todo) => (
              <TodoItem
                key={todo.id}
                todo={todo}
                onToggle={handleToggle}
                onDelete={handleDelete}
              />
            ))}
          </ul>
          <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
            残り {remainingCount} / {optimisticTodos.length} 件
          </p>
        </>
      )}
    </div>
  );
}
