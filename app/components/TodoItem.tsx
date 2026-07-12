"use client";

import { useTransition } from "react";
import { updateTodoStatus } from "@/app/todos/actions";
import { getDueStatus } from "@/lib/date";
import { getTodoColorDotClass } from "@/lib/todoColors";

export type TodoStatus = "not_started" | "in_progress" | "completed";

export type Todo = {
  id: string;
  text: string;
  status: TodoStatus;
  due_date: string | null;
  due_time: string | null;
  color: string | null;
};

type TodoItemProps = {
  todo: Todo;
  onStatusChange: (id: string, status: TodoStatus) => void;
  onEdit: (id: string) => void;
};

function formatDueDate(dueDate: string, dueTime: string | null) {
  const [year, month, day] = dueDate.split("-");
  // Postgres returns `time` values as "HH:MM:SS"; only HH:MM is shown.
  return dueTime ? `${year}/${month}/${day} ${dueTime.slice(0, 5)}` : `${year}/${month}/${day}`;
}

export default function TodoItem({ todo, onStatusChange, onEdit }: TodoItemProps) {
  const [isPending, startTransition] = useTransition();
  const isCompleted = todo.status === "completed";
  const dueStatus = getDueStatus(todo.due_date, isCompleted);
  const colorDotClass = getTodoColorDotClass(todo.color);

  const borderClass =
    dueStatus === "today"
      ? "border-4 border-red-500 dark:border-red-500"
      : "border border-indigo-100 hover:border-indigo-300 dark:border-indigo-400/25 dark:hover:border-indigo-400/60";

  return (
    <li
      className={`animate-todo-in flex items-center gap-2 rounded-xl ${borderClass} bg-white px-3 py-3.5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:bg-transparent dark:bg-gradient-to-br dark:from-white/[0.06] dark:to-indigo-500/[0.03] dark:hover:from-white/[0.09]`}
    >
      <input
        type="checkbox"
        checked={isCompleted}
        disabled={isPending}
        onChange={() => {
          const nextStatus: TodoStatus = isCompleted ? "not_started" : "completed";
          startTransition(async () => {
            onStatusChange(todo.id, nextStatus);
            await updateTodoStatus(todo.id, nextStatus);
          });
        }}
        className="h-5 w-5 shrink-0 accent-indigo-600 transition-transform active:scale-90"
        aria-label={`${todo.text} を完了にする`}
      />
      {colorDotClass && (
        <span
          className={`h-2.5 w-2.5 shrink-0 rounded-full ${colorDotClass}`}
          aria-hidden
        />
      )}
      <span
        className={`flex-1 break-words transition-all duration-300 ${
          isCompleted
            ? "text-zinc-400 line-through dark:text-zinc-600"
            : "text-zinc-900 dark:text-zinc-50"
        }`}
      >
        {todo.text}
      </span>
      {todo.due_date && (
        <span
          className={`shrink-0 text-xs ${
            dueStatus === "overdue"
              ? "font-medium text-red-600 dark:text-red-400"
              : dueStatus === "today"
                ? "font-medium text-orange-600 dark:text-orange-400"
                : dueStatus === "soon"
                  ? "font-medium text-amber-600 dark:text-amber-500"
                  : "text-zinc-400 dark:text-zinc-500"
          }`}
        >
          {formatDueDate(todo.due_date, todo.due_time)}
        </span>
      )}
      <button
        type="button"
        onClick={() => onEdit(todo.id)}
        className="shrink-0 rounded-md px-2 py-1 text-sm text-zinc-400 transition-colors hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-300"
        aria-label={`${todo.text} を編集`}
      >
        編集
      </button>
    </li>
  );
}
