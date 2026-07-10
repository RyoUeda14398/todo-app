"use client";

import { useState } from "react";
import type { Todo } from "@/app/components/TodoItem";

type CalendarProps = {
  todos: Todo[];
};

type Cell = {
  day: number;
  dateKey: string;
};

const WEEKDAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"];

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function toDateKey(year: number, monthIndex: number, day: number) {
  return `${year}-${pad(monthIndex + 1)}-${pad(day)}`;
}

export default function Calendar({ todos }: CalendarProps) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [monthIndex, setMonthIndex] = useState(now.getMonth());

  const todosByDate = new Map<string, Todo[]>();
  for (const todo of todos) {
    if (!todo.due_date) continue;
    const list = todosByDate.get(todo.due_date);
    if (list) {
      list.push(todo);
    } else {
      todosByDate.set(todo.due_date, [todo]);
    }
  }

  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const startWeekday = new Date(year, monthIndex, 1).getDay();

  const cells: Array<Cell | null> = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push({ day, dateKey: toDateKey(year, monthIndex, day) });
  }
  while (cells.length % 7 !== 0) cells.push(null);

  const todayKey = toDateKey(now.getFullYear(), now.getMonth(), now.getDate());

  function goToPrevMonth() {
    if (monthIndex === 0) {
      setYear((y) => y - 1);
      setMonthIndex(11);
    } else {
      setMonthIndex((m) => m - 1);
    }
  }

  function goToNextMonth() {
    if (monthIndex === 11) {
      setYear((y) => y + 1);
      setMonthIndex(0);
    } else {
      setMonthIndex((m) => m + 1);
    }
  }

  function goToToday() {
    setYear(now.getFullYear());
    setMonthIndex(now.getMonth());
  }

  return (
    <div className="w-full rounded-2xl border border-zinc-200 bg-white/80 p-4 shadow-sm backdrop-blur-sm sm:p-6 dark:border-zinc-800 dark:bg-zinc-950/80">
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={goToPrevMonth}
          aria-label="前の月"
          className="rounded-lg p-2 text-zinc-500 hover:bg-indigo-50 hover:text-indigo-600 dark:text-zinc-400 dark:hover:bg-indigo-950 dark:hover:text-indigo-400"
        >
          ←
        </button>
        <button
          type="button"
          onClick={goToToday}
          className="text-lg font-semibold text-zinc-900 hover:text-indigo-600 dark:text-zinc-50 dark:hover:text-indigo-400"
        >
          {year}年{monthIndex + 1}月
        </button>
        <button
          type="button"
          onClick={goToNextMonth}
          aria-label="次の月"
          className="rounded-lg p-2 text-zinc-500 hover:bg-indigo-50 hover:text-indigo-600 dark:text-zinc-400 dark:hover:bg-indigo-950 dark:hover:text-indigo-400"
        >
          →
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-zinc-400 dark:text-zinc-500">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="py-1">
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell, i) => {
          if (!cell) return <div key={`empty-${i}`} />;

          const dayTodos = todosByDate.get(cell.dateKey) ?? [];
          const isToday = cell.dateKey === todayKey;
          const visibleTodos = dayTodos.slice(0, 3);
          const hiddenCount = dayTodos.length - visibleTodos.length;

          return (
            <div
              key={cell.dateKey}
              className={`flex min-h-[4.5rem] flex-col gap-0.5 rounded-lg border p-1 text-left sm:min-h-24 sm:p-1.5 ${
                isToday
                  ? "border-indigo-500 bg-indigo-50/60 dark:border-indigo-400 dark:bg-indigo-950/40"
                  : "border-zinc-100 dark:border-zinc-900"
              }`}
            >
              <span
                className={`text-xs ${
                  isToday
                    ? "font-bold text-indigo-600 dark:text-indigo-400"
                    : "text-zinc-400 dark:text-zinc-600"
                }`}
              >
                {cell.day}
              </span>
              <div className="flex flex-col gap-0.5 overflow-hidden">
                {visibleTodos.map((todo) => (
                  <span
                    key={todo.id}
                    className={`truncate rounded px-1 text-[10px] leading-tight ${
                      todo.completed
                        ? "bg-zinc-100 text-zinc-400 line-through dark:bg-zinc-900 dark:text-zinc-600"
                        : "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300"
                    }`}
                  >
                    {todo.text}
                  </span>
                ))}
                {hiddenCount > 0 && (
                  <span className="text-[10px] text-zinc-400 dark:text-zinc-600">
                    +{hiddenCount}件
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
