"use client";

import type { Todo } from "@/app/components/TodoItem";
import { getTodoColorDotClass } from "@/lib/todoColors";

type DayTasksModalProps = {
  dateKey: string;
  todos: Todo[];
  onClose: () => void;
  onSelectTodo: (id: string) => void;
};

function formatDate(dateKey: string) {
  const [year, month, day] = dateKey.split("-");
  return `${year}年${month}月${day}日`;
}

export default function DayTasksModal({
  dateKey,
  todos,
  onClose,
  onSelectTodo,
}: DayTasksModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-md rounded-2xl border-2 border-indigo-200/70 bg-white p-6 shadow-2xl dark:border-indigo-400/40 dark:bg-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
            {formatDate(dateKey)}のタスク
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="閉じる"
            className="shrink-0 rounded-lg p-1 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-white/10 dark:hover:text-zinc-300"
          >
            ✕
          </button>
        </div>

        <ul className="flex flex-col gap-2">
          {todos.map((todo) => {
            const colorDotClass = getTodoColorDotClass(todo.color);
            return (
              <li key={todo.id}>
                <button
                  type="button"
                  onClick={() => onSelectTodo(todo.id)}
                  className="flex w-full items-center gap-2 rounded-xl border border-indigo-100 bg-white px-3 py-2.5 text-left text-sm transition-colors hover:border-indigo-300 hover:bg-indigo-50/50 dark:border-indigo-400/25 dark:bg-white/[0.04] dark:hover:bg-white/[0.08]"
                >
                  {colorDotClass && (
                    <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${colorDotClass}`} aria-hidden />
                  )}
                  <span
                    className={`flex-1 break-words ${
                      todo.status === "completed"
                        ? "text-zinc-400 line-through dark:text-zinc-500"
                        : "text-zinc-900 dark:text-zinc-50"
                    }`}
                  >
                    {todo.text}
                  </span>
                  {todo.due_time && (
                    <span className="shrink-0 text-xs text-zinc-400 dark:text-zinc-500">
                      {todo.due_time.slice(0, 5)}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
