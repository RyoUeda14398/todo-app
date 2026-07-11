"use client";

import { useTransition } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
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

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: todo.id, data: { type: "list-item" } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`animate-todo-in flex items-center gap-2 rounded-xl border border-indigo-100 bg-white px-3 py-3.5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md dark:border-indigo-400/25 dark:bg-transparent dark:bg-gradient-to-br dark:from-white/[0.06] dark:to-indigo-500/[0.03] dark:hover:border-indigo-400/60 dark:hover:from-white/[0.09] ${
        isDragging ? "opacity-40" : ""
      }`}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="shrink-0 cursor-grab touch-none rounded p-1 text-zinc-300 hover:text-zinc-500 active:cursor-grabbing dark:text-zinc-600 dark:hover:text-zinc-400"
        aria-label={`${todo.text} を並び替え`}
      >
        <svg width="12" height="16" viewBox="0 0 12 16" fill="currentColor" aria-hidden>
          <circle cx="3" cy="2" r="1.3" />
          <circle cx="9" cy="2" r="1.3" />
          <circle cx="3" cy="8" r="1.3" />
          <circle cx="9" cy="8" r="1.3" />
          <circle cx="3" cy="14" r="1.3" />
          <circle cx="9" cy="14" r="1.3" />
        </svg>
      </button>
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
        className="h-5 w-5 shrink-0 accent-indigo-600 transition-transform active:scale-90"
        aria-label={`${todo.text} を完了にする`}
      />
      <span
        className={`flex-1 break-words transition-all duration-300 ${
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
        className="shrink-0 rounded-md px-2 py-1 text-sm text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:hover:bg-red-950"
        aria-label={`${todo.text} を削除`}
      >
        削除
      </button>
    </li>
  );
}
