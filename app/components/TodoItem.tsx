"use client";

import { useTransition } from "react";
import { toggleTodo, deleteTodo } from "@/app/todos/actions";

export type Todo = {
  id: string;
  text: string;
  completed: boolean;
};

type TodoItemProps = {
  todo: Todo;
};

export default function TodoItem({ todo }: TodoItemProps) {
  const [isPending, startTransition] = useTransition();

  return (
    <li className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
      <input
        type="checkbox"
        checked={todo.completed}
        disabled={isPending}
        onChange={() =>
          startTransition(() => {
            toggleTodo(todo.id, !todo.completed);
          })
        }
        className="h-5 w-5 shrink-0 accent-zinc-900 dark:accent-zinc-50"
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
      <button
        type="button"
        disabled={isPending}
        onClick={() =>
          startTransition(() => {
            deleteTodo(todo.id);
          })
        }
        className="shrink-0 rounded-md px-2 py-1 text-sm text-zinc-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:hover:bg-red-950"
        aria-label={`${todo.text} を削除`}
      >
        削除
      </button>
    </li>
  );
}
