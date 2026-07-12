"use client";

import { useTransition } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { updateTodoStatus, deleteTodo } from "@/app/todos/actions";
import { getDueStatus } from "@/lib/date";
import { getTodoColorDotClass } from "@/lib/todoColors";

export type TodoStatus = "not_started" | "in_progress" | "completed";

export type Todo = {
  id: string;
  text: string;
  status: TodoStatus;
  due_date: string | null;
  color: string | null;
};

type TodoItemProps = {
  todo: Todo;
  onStatusChange: (id: string, status: TodoStatus) => void;
  onDelete: (id: string) => void;
};

function formatDueDate(dueDate: string) {
  const [year, month, day] = dueDate.split("-");
  return `${year}/${month}/${day}`;
}

export default function TodoItem({ todo, onStatusChange, onDelete }: TodoItemProps) {
  const [isPending, startTransition] = useTransition();
  const isCompleted = todo.status === "completed";
  const dueStatus = getDueStatus(todo.due_date, isCompleted);
  const colorDotClass = getTodoColorDotClass(todo.color);

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
