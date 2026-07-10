"use client";

import { useState } from "react";
import { useDraggable, useDroppable } from "@dnd-kit/core";
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

function CalendarChip({ todo }: { todo: Todo }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `chip-${todo.id}`,
    data: { type: "calendar-chip", todoId: todo.id },
  });

  return (
    <span
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={`truncate rounded-md px-1 text-[10px] leading-tight transition-all hover:scale-[1.03] ${
        isDragging ? "cursor-grabbing opacity-30" : "cursor-grab"
      } ${
        todo.completed
          ? "bg-zinc-100 text-zinc-400 line-through dark:bg-white/5 dark:text-zinc-500"
          : "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/25 dark:text-indigo-200"
      }`}
    >
      {todo.text}
    </span>
  );
}

function DayCell({
  cell,
  isToday,
  dayTodos,
}: {
  cell: Cell;
  isToday: boolean;
  dayTodos: Todo[];
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `day-${cell.dateKey}`,
    data: { type: "calendar-day", dateKey: cell.dateKey },
  });

  const visibleTodos = dayTodos.slice(0, 3);
  const hiddenCount = dayTodos.length - visibleTodos.length;

  return (
    <div
      ref={setNodeRef}
      className={`flex min-h-[4.5rem] flex-col gap-1 rounded-lg border p-1 text-left transition-colors sm:min-h-24 sm:p-1.5 ${
        isOver
          ? "border-indigo-500 bg-indigo-100/70 dark:border-indigo-400 dark:bg-indigo-500/20"
          : isToday
            ? "border-indigo-400 bg-indigo-50/60 dark:border-indigo-400/60 dark:bg-indigo-500/10"
            : "border-zinc-200 hover:border-zinc-300 dark:border-white/10 dark:hover:border-white/25"
      }`}
    >
      <span
        className={`flex h-5 w-5 items-center justify-center rounded-full text-xs ${
          isToday
            ? "bg-indigo-600 font-bold text-white dark:bg-indigo-500"
            : "text-zinc-400 dark:text-zinc-500"
        }`}
      >
        {cell.day}
      </span>
      <div className="flex flex-col gap-0.5 overflow-hidden">
        {visibleTodos.map((todo) => (
          <CalendarChip key={todo.id} todo={todo} />
        ))}
        {hiddenCount > 0 && (
          <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
            +{hiddenCount}件
          </span>
        )}
      </div>
    </div>
  );
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
    <div className="w-full rounded-3xl border border-zinc-200/80 bg-white/90 p-4 shadow-xl shadow-zinc-200/60 backdrop-blur-md sm:p-6 dark:border-white/10 dark:bg-zinc-950/70 dark:shadow-[0_0_40px_-15px_rgba(99,102,241,0.4)]">
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={goToPrevMonth}
          aria-label="前の月"
          className="rounded-lg p-2 text-zinc-500 transition-colors hover:bg-indigo-50 hover:text-indigo-600 dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-indigo-300"
        >
          ←
        </button>
        <button
          type="button"
          onClick={goToToday}
          className="text-lg font-bold tracking-tight text-zinc-900 transition-colors hover:text-indigo-600 dark:text-zinc-50 dark:hover:text-indigo-300"
        >
          {year}年{monthIndex + 1}月
        </button>
        <button
          type="button"
          onClick={goToNextMonth}
          aria-label="次の月"
          className="rounded-lg p-2 text-zinc-500 transition-colors hover:bg-indigo-50 hover:text-indigo-600 dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-indigo-300"
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
          return (
            <DayCell
              key={cell.dateKey}
              cell={cell}
              isToday={cell.dateKey === todayKey}
              dayTodos={todosByDate.get(cell.dateKey) ?? []}
            />
          );
        })}
      </div>
    </div>
  );
}
