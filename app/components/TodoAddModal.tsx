"use client";

import { useState } from "react";
import { TODO_COLORS } from "@/lib/todoColors";

export type NewTodoData = {
  text: string;
  due_date: string;
  due_time: string | null;
  color: string | null;
};

type TodoAddModalProps = {
  dueDate: string;
  onClose: () => void;
  onAdd: (data: NewTodoData) => void;
};

function formatDate(dueDate: string) {
  const [year, month, day] = dueDate.split("-");
  return `${year}年${month}月${day}日`;
}

export default function TodoAddModal({ dueDate, onClose, onAdd }: TodoAddModalProps) {
  const [text, setText] = useState("");
  const [date, setDate] = useState(dueDate);
  const [dueTime, setDueTime] = useState("");
  const [color, setColor] = useState<string | null>(null);

  function handleAdd() {
    const trimmed = text.trim();
    if (!trimmed || !date) return;
    onAdd({
      text: trimmed,
      due_date: date,
      due_time: dueTime || null,
      color,
    });
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
        <div className="flex flex-col gap-3">
          <div className="flex items-start justify-between gap-4">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
              {formatDate(dueDate)}のタスクを追加
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

          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="やることを入力..."
            autoFocus
            required
            className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-zinc-900 placeholder:text-zinc-400 focus:border-indigo-500 focus:outline-none dark:border-white/15 dark:bg-white/5 dark:text-zinc-50"
          />

          <div className="flex flex-wrap gap-2">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              aria-label="締切日"
              className="rounded-xl border border-zinc-300 bg-white px-2 py-2 text-sm text-zinc-900 focus:border-indigo-500 focus:outline-none dark:border-white/15 dark:bg-white/5 dark:text-zinc-50 dark:[color-scheme:dark]"
            />
            <input
              type="time"
              value={dueTime}
              onChange={(e) => setDueTime(e.target.value)}
              aria-label="締切時刻(任意)"
              className="rounded-xl border border-zinc-300 bg-white px-2 py-2 text-sm text-zinc-900 focus:border-indigo-500 focus:outline-none dark:border-white/15 dark:bg-white/5 dark:text-zinc-50 dark:[color-scheme:dark]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-zinc-400 dark:text-zinc-500">色(任意):</span>
            {TODO_COLORS.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => setColor(c.value === color ? null : c.value)}
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

          <div className="mt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-sm font-semibold text-zinc-500 transition-colors hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-white/10"
            >
              キャンセル
            </button>
            <button
              type="button"
              onClick={handleAdd}
              className="rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-md transition-all hover:-translate-y-0.5"
            >
              追加
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
