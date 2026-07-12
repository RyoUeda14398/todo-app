"use client";

import { Pencil } from "lucide-react";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import type { Todo, TodoStatus } from "@/app/components/TodoItem";
import { getDueStatus } from "@/lib/date";
import { getTodoColorDotClass } from "@/lib/todoColors";

type KanbanBoardProps = {
  todos: Todo[];
  onEdit: (id: string) => void;
};

const COLUMNS: { status: TodoStatus; label: string }[] = [
  { status: "not_started", label: "未着手" },
  { status: "in_progress", label: "進行中" },
  { status: "completed", label: "完了" },
];

function formatDueDate(dueDate: string, dueTime: string | null) {
  const [year, month, day] = dueDate.split("-");
  // Postgres returns `time` values as "HH:MM:SS"; only HH:MM is shown.
  return dueTime ? `${year}/${month}/${day} ${dueTime.slice(0, 5)}` : `${year}/${month}/${day}`;
}

function KanbanCard({ todo, onEdit }: { todo: Todo; onEdit: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `kanban-${todo.id}`,
    data: { type: "kanban-card", todoId: todo.id },
  });

  const dueStatus = getDueStatus(todo.due_date, todo.status === "completed");
  const colorDotClass = getTodoColorDotClass(todo.color);

  const borderClass =
    dueStatus === "today"
      ? "border-4 border-red-500 dark:border-red-500"
      : "border border-indigo-100 hover:border-indigo-300 dark:border-indigo-400/25 dark:hover:border-indigo-400/60";

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={`cursor-grab touch-none select-none rounded-xl ${borderClass} bg-white px-3 py-2.5 text-sm shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md active:cursor-grabbing dark:bg-white/[0.04] ${
        isDragging ? "opacity-30" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-1.5">
        <p className="flex items-start gap-1.5 text-zinc-900 dark:text-zinc-50">
          {colorDotClass && (
            <span
              className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${colorDotClass}`}
              aria-hidden
            />
          )}
          <span className="break-words">{todo.text}</span>
        </p>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onEdit(todo.id);
          }}
          aria-label={`${todo.text} を編集`}
          className="shrink-0 rounded p-1 text-zinc-300 transition-colors hover:bg-indigo-50 hover:text-indigo-600 dark:text-zinc-500 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-300"
        >
          <Pencil size={13} />
        </button>
      </div>
      {todo.due_date && (
        <p
          className={`mt-1 text-xs ${
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
        </p>
      )}
    </div>
  );
}

function KanbanColumn({
  status,
  label,
  todos,
  onEdit,
}: {
  status: TodoStatus;
  label: string;
  todos: Todo[];
  onEdit: (id: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `kanban-column-${status}`,
    data: { type: "kanban-column", status },
  });

  return (
    <div
      ref={setNodeRef}
      className={`flex min-h-40 flex-1 flex-col gap-2 rounded-2xl border p-3 transition-colors sm:min-h-64 ${
        isOver
          ? "border-indigo-500 bg-indigo-100/70 dark:border-indigo-400 dark:bg-indigo-500/20"
          : "border-zinc-200 bg-zinc-50/60 dark:border-white/20 dark:bg-white/[0.03]"
      }`}
    >
      <div className="mb-1 flex items-center justify-between">
        <h3 className="text-sm font-bold text-zinc-700 dark:text-zinc-200">{label}</h3>
        <span className="text-xs text-zinc-400 dark:text-zinc-500">{todos.length}件</span>
      </div>
      <div className="flex flex-col gap-2">
        {todos.map((todo) => (
          <KanbanCard key={todo.id} todo={todo} onEdit={onEdit} />
        ))}
        {todos.length === 0 && (
          <p className="py-4 text-center text-xs text-zinc-400 dark:text-zinc-600">
            ここにドラッグ
          </p>
        )}
      </div>
    </div>
  );
}

export default function KanbanBoard({ todos, onEdit }: KanbanBoardProps) {
  return (
    <div className="w-full rounded-3xl border-2 border-indigo-200/70 bg-gradient-to-br from-white via-indigo-50/50 to-violet-50/70 p-6 shadow-[0_25px_60px_-20px_rgba(99,102,241,0.35)] backdrop-blur-2xl sm:p-8 dark:border-indigo-400/40 dark:bg-gradient-to-br dark:from-zinc-900/80 dark:via-zinc-950/80 dark:to-indigo-950/40 dark:shadow-[0_0_50px_-12px_rgba(99,102,241,0.45),inset_0_1px_0_0_rgba(255,255,255,0.06)]">
      <h2 className="mb-6 text-2xl font-black tracking-tight text-zinc-900 sm:text-3xl dark:text-zinc-50">
        ボード
      </h2>
      <div className="flex flex-col gap-4 sm:flex-row">
        {COLUMNS.map((col) => (
          <KanbanColumn
            key={col.status}
            status={col.status}
            label={col.label}
            todos={todos.filter((t) => t.status === col.status)}
            onEdit={onEdit}
          />
        ))}
      </div>
    </div>
  );
}
