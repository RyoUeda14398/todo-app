"use client";

import { useState } from "react";
import type { Todo } from "@/app/components/TodoItem";
import { TODO_COLORS, getTodoColorDotClass } from "@/lib/todoColors";

export type TodoUpdates = {
  text: string;
  due_date: string | null;
  due_time: string | null;
  color: string | null;
};

type TodoDetailModalProps = {
  todo: Todo;
  initialMode?: "view" | "edit";
  onClose: () => void;
  onSave: (id: string, updates: TodoUpdates) => void;
  onDelete: (id: string) => void;
  // Permanently removes a soft-deleted ("削除済み") past record. Only offered
  // when the opened todo is already soft-deleted.
  onPermanentDelete: (id: string) => void;
};

function formatDueDateTime(dueDate: string | null, dueTime: string | null) {
  if (!dueDate) return "締切なし";
  const [year, month, day] = dueDate.split("-");
  const datePart = `${year}年${month}月${day}日`;
  // Postgres returns `time` values as "HH:MM:SS"; only HH:MM is shown.
  return dueTime ? `${datePart} ${dueTime.slice(0, 5)}` : datePart;
}

export default function TodoDetailModal({
  todo,
  initialMode = "view",
  onClose,
  onSave,
  onDelete,
  onPermanentDelete,
}: TodoDetailModalProps) {
  const isDeleted = todo.deleted_at !== null;
  const [isEditing, setIsEditing] = useState(!isDeleted && initialMode === "edit");
  const [text, setText] = useState(todo.text);
  const [dueDate, setDueDate] = useState(todo.due_date ?? "");
  const [dueTime, setDueTime] = useState(todo.due_time ? todo.due_time.slice(0, 5) : "");
  const [color, setColor] = useState<string | null>(todo.color);

  const colorDotClass = getTodoColorDotClass(todo.color);

  function handleCancelEdit() {
    setText(todo.text);
    setDueDate(todo.due_date ?? "");
    setDueTime(todo.due_time ? todo.due_time.slice(0, 5) : "");
    setColor(todo.color);
    setIsEditing(false);
  }

  function handleSave() {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSave(todo.id, {
      text: trimmed,
      due_date: dueDate || null,
      due_time: dueDate && dueTime ? dueTime : null,
      color,
    });
    onClose();
  }

  function handleDelete() {
    onDelete(todo.id);
    onClose();
  }

  function handlePermanentDelete() {
    onPermanentDelete(todo.id);
    onClose();
  }

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
        {isDeleted ? (
          // A soft-deleted past record: read-only, with a permanent-delete
          // action. (Opened by tapping a grayed-out chip on the calendar.)
          <>
            <div className="mb-3 flex items-start justify-between gap-4">
              <div className="flex min-w-0 items-center gap-2">
                {colorDotClass && (
                  <span className={`h-3 w-3 shrink-0 rounded-full opacity-60 ${colorDotClass}`} aria-hidden />
                )}
                <h2 className="break-words text-lg font-bold text-zinc-500 line-through dark:text-zinc-400">
                  {todo.text}
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="閉じる"
                className="shrink-0 rounded-lg p-1 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-white/10 dark:hover:text-zinc-300"
              >
                ✕
              </button>
            </div>
            <p className="mb-1 inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-500 dark:bg-white/10 dark:text-zinc-400">
              リストから削除済み(カレンダーの記録)
            </p>
            <p className="mb-5 mt-3 text-sm text-zinc-500 dark:text-zinc-400">
              締切:{" "}
              <span className="font-medium text-zinc-600 dark:text-zinc-300">
                {formatDueDateTime(todo.due_date, todo.due_time)}
              </span>
            </p>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handlePermanentDelete}
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-md transition-all hover:-translate-y-0.5 hover:bg-red-700"
              >
                完全に削除
              </button>
            </div>
          </>
        ) : isEditing ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-start justify-between gap-4">
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">タスクを編集</h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="閉じる"
                className="shrink-0 rounded-lg p-1 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-white/10 dark:hover:text-zinc-300"
              >
                ✕
              </button>
            </div>

            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              required
              className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-zinc-900 focus:border-indigo-500 focus:outline-none dark:border-white/15 dark:bg-white/5 dark:text-zinc-50"
            />

            <div className="flex flex-wrap gap-2">
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                aria-label="締切日"
                className="rounded-xl border border-zinc-300 bg-white px-2 py-2 text-sm text-zinc-900 focus:border-indigo-500 focus:outline-none dark:border-white/15 dark:bg-white/5 dark:text-zinc-50 dark:[color-scheme:dark]"
              />
              <input
                type="time"
                value={dueTime}
                onChange={(e) => setDueTime(e.target.value)}
                aria-label="締切時刻"
                className="rounded-xl border border-zinc-300 bg-white px-2 py-2 text-sm text-zinc-900 focus:border-indigo-500 focus:outline-none dark:border-white/15 dark:bg-white/5 dark:text-zinc-50 dark:[color-scheme:dark]"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-zinc-400 dark:text-zinc-500">色:</span>
              <button
                type="button"
                onClick={() => setColor(null)}
                aria-label="色なし"
                title="色なし"
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-zinc-300 text-[10px] text-zinc-400 transition-all hover:scale-110 dark:border-zinc-600 ${
                  color === null ? "ring-2 ring-zinc-900 ring-offset-2 ring-offset-white dark:ring-white dark:ring-offset-zinc-900" : ""
                }`}
              >
                ✕
              </button>
              {TODO_COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setColor(c.value)}
                  aria-label={c.label}
                  title={c.label}
                  className={`h-6 w-6 shrink-0 rounded-full ${c.dot} transition-all hover:scale-110 ${
                    color === c.value
                      ? "ring-2 ring-zinc-900 ring-offset-2 ring-offset-white dark:ring-white dark:ring-offset-zinc-900"
                      : ""
                  }`}
                />
              ))}
            </div>

            <div className="mt-2 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={handleDelete}
                className="rounded-xl px-4 py-2 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
              >
                削除
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="rounded-xl px-4 py-2 text-sm font-semibold text-zinc-500 transition-colors hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-white/10"
                >
                  キャンセル
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-md transition-all hover:-translate-y-0.5"
                >
                  保存
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-4 flex items-start justify-between gap-4">
              <div className="flex min-w-0 items-center gap-2">
                {colorDotClass && (
                  <span className={`h-3 w-3 shrink-0 rounded-full ${colorDotClass}`} aria-hidden />
                )}
                <h2 className="break-words text-lg font-bold text-zinc-900 dark:text-zinc-50">
                  {todo.text}
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="閉じる"
                className="shrink-0 rounded-lg p-1 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-white/10 dark:hover:text-zinc-300"
              >
                ✕
              </button>
            </div>
            <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
              締切:{" "}
              <span className="font-medium text-zinc-700 dark:text-zinc-200">
                {formatDueDateTime(todo.due_date, todo.due_time)}
              </span>
            </p>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-md transition-all hover:-translate-y-0.5"
              >
                編集
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
