"use client";

import { useTransition } from "react";
import { toggleTodo, deleteTodo } from "@/app/todos/actions";
import { getTodayInJST } from "@/lib/date";

export type Todo = {
  id: string;
  text: string;
  completed: boolean;
  due_date: string | null;
};

type TodoItemProps = {
  todo: Todo;
  onToggle: (id: string, completed: boolean) => void;
  onDelete: (id: string) => void;
};

function formatDueDate(dueDate: string) {
  const [year, month, day] = dueDate.split("-");
  return `${year}/${month}/${day}`;
}

function isOverdue(dueDate: string) {
  return dueDate < getTodayInJST();
}

export default function TodoItem({ todo, onToggle, onDelete }: TodoItemProps) {
  const [isPending, startTransition] = useTransition();
  const overdue = !todo.completed && todo.due_date !== null && isOverdue(todo.due_date);

  return (
    <li className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-white px-4 py-3 transition-colors hover:border-indigo-200 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-indigo-900">
      <input
        type="checkbox"
        checked={todo.completed}
        disabled={isPending}
        onChange={() => {
          const nextCompleted = !todo.completed;
          startTransition(async () => {
            onToggle(todo.id, nextCompleted);
            await toggleTodo(todo.id, nextCompleted);
          });
        }}
        className="h-5 w-5 shrink-0 accent-indigo-600"
        aria-label={`${todo.text} を完了にする`}
      />
      <span
        className={`flex-1 break-words ${
          todo.completed
            ? "text-zinc-400 line-through dark:text-zinc-600"
            : "text-zinc-900 dark:text-zinc-50"
        }`}
      >
        {todo.text}
      </span>
      {todo.due_date && (
        <span
          className={`shrink-0 text-xs ${
            overdue
              ? "font-medium text-red-600 dark:text-red-400"
              : "text-zinc-400 dark:text-zinc-500"
          }`}
        >
          {formatDueDate(todo.due_date)}
        </span>
      )}
      <button
        type="button"
        disabled={isPending}
        onClick={() => {
          startTransition(async () => {
            onDelete(todo.id);
            await deleteTodo(todo.id);
          });
        }}
        className="shrink-0 rounded-md px-2 py-1 text-sm text-zinc-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:hover:bg-red-950"
        aria-label={`${todo.text} を削除`}
      >
        削除
      </button>
    </li>
  );
}
