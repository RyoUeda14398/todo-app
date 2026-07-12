"use client";

import { useState } from "react";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import holiday_jp from "@holiday-jp/holiday_jp";
import type { Todo } from "@/app/components/TodoItem";
import { getTodoColorChipClass } from "@/lib/todoColors";

type CalendarProps = {
  todos: Todo[];
  onSelectTodo: (id: string) => void;
  onAddTodo: (dateKey: string) => void;
  onShowMore: (dateKey: string) => void;
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

function CalendarChip({
  todo,
  onSelectTodo,
}: {
  todo: Todo;
  onSelectTodo: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `chip-${todo.id}`,
    data: { type: "calendar-chip", todoId: todo.id },
  });

  const colorChipClass = getTodoColorChipClass(todo.color);

  return (
    <span
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={(e) => {
        e.stopPropagation();
        onSelectTodo(todo.id);
      }}
      className={`select-none break-words rounded-md px-1 py-0.5 text-xs font-medium leading-tight transition-all hover:scale-[1.03] ${
        isDragging ? "cursor-grabbing opacity-30" : "cursor-grab"
      } ${
        todo.status === "completed"
          ? "bg-zinc-100 text-zinc-400 line-through dark:bg-white/5 dark:text-zinc-500"
          : (colorChipClass ?? "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/25 dark:text-indigo-200")
      }`}
      title={todo.due_time ? `${todo.text} (${todo.due_time.slice(0, 5)})` : todo.text}
    >
      {todo.due_time ? `${todo.due_time.slice(0, 5)} ${todo.text}` : todo.text}
    </span>
  );
}

function DayCell({
  cell,
  isToday,
  dayTodos,
  holidayName,
  onSelectTodo,
  onAddTodo,
  onShowMore,
}: {
  cell: Cell;
  isToday: boolean;
  dayTodos: Todo[];
  holidayName: string | null;
  onSelectTodo: (id: string) => void;
  onAddTodo: (dateKey: string) => void;
  onShowMore: (dateKey: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `day-${cell.dateKey}`,
    data: { type: "calendar-day", dateKey: cell.dateKey },
  });

  const visibleTodos = dayTodos.slice(0, 3);
  const hiddenCount = dayTodos.length - visibleTodos.length;
  const hasTodos = dayTodos.length > 0;

  return (
    <div
      ref={setNodeRef}
      onClick={() => onAddTodo(cell.dateKey)}
      className={`flex min-h-[5rem] cursor-pointer flex-col gap-1 rounded-lg border p-1 text-left transition-all sm:min-h-28 sm:p-1.5 ${
        isOver
          ? "border-indigo-500 bg-indigo-100/70 dark:border-indigo-400 dark:bg-indigo-500/20"
          : isToday
            ? "border-indigo-400 bg-indigo-50/60 dark:border-indigo-400/60 dark:bg-indigo-500/15"
            : hasTodos
              ? "border-indigo-200 border-l-4 border-l-indigo-500 bg-indigo-50/50 shadow-[0_0_12px_-4px_rgba(99,102,241,0.4)] hover:-translate-y-0.5 hover:bg-indigo-50/80 hover:shadow-[0_0_16px_-3px_rgba(99,102,241,0.6)] dark:border-white/20 dark:border-l-indigo-400 dark:bg-indigo-500/[0.08] dark:shadow-[0_0_12px_-4px_rgba(129,140,248,0.4)] dark:hover:bg-indigo-500/[0.14] dark:hover:shadow-[0_0_16px_-3px_rgba(129,140,248,0.6)]"
              : "border-zinc-200 bg-zinc-50/60 hover:-translate-y-0.5 hover:border-indigo-200 hover:bg-indigo-50/40 hover:shadow-md dark:border-white/20 dark:bg-white/[0.03] dark:hover:border-indigo-400/40 dark:hover:bg-white/[0.06]"
      }`}
    >
      <span
        className={`flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold sm:h-8 sm:w-8 sm:text-base ${
          isToday
            ? holidayName
              ? "bg-indigo-600 text-rose-200 shadow-[0_0_16px_-2px_rgba(99,102,241,0.7)] dark:bg-indigo-500"
              : "bg-indigo-600 text-white shadow-[0_0_16px_-2px_rgba(99,102,241,0.7)] dark:bg-indigo-500"
            : holidayName
              ? "text-rose-600 dark:text-rose-400"
              : "text-zinc-500 dark:text-zinc-400"
        }`}
      >
        {cell.day}
      </span>
      <div className="flex flex-col gap-0.5 overflow-hidden">
        {holidayName && (
          <span className="truncate text-[10px] font-semibold text-rose-600 dark:text-rose-400">
            {holidayName}
          </span>
        )}
        {visibleTodos.map((todo) => (
          <CalendarChip key={todo.id} todo={todo} onSelectTodo={onSelectTodo} />
        ))}
        {hiddenCount > 0 && (
          <span
            onClick={(e) => {
              e.stopPropagation();
              onShowMore(cell.dateKey);
            }}
            className="cursor-pointer text-[10px] font-semibold text-indigo-500 underline decoration-dotted underline-offset-2 hover:text-indigo-600 dark:text-indigo-300 dark:hover:text-indigo-200"
          >
            +{hiddenCount}件
          </span>
        )}
      </div>
    </div>
  );
}

export default function Calendar({ todos, onSelectTodo, onAddTodo, onShowMore }: CalendarProps) {
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

  const holidaysByDate = new Map<string, string>();
  const monthStart = new Date(Date.UTC(year, monthIndex, 1));
  const monthEnd = new Date(Date.UTC(year, monthIndex + 1, 0));
  for (const holiday of holiday_jp.between(monthStart, monthEnd)) {
    const key = toDateKey(
      holiday.date.getUTCFullYear(),
      holiday.date.getUTCMonth(),
      holiday.date.getUTCDate()
    );
    holidaysByDate.set(key, holiday.name);
  }

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
    <div className="w-full rounded-3xl border-2 border-indigo-200/70 bg-gradient-to-br from-white via-indigo-50/50 to-violet-50/70 py-6 shadow-[0_25px_60px_-20px_rgba(99,102,241,0.35)] backdrop-blur-2xl sm:py-8 dark:border-indigo-400/40 dark:bg-gradient-to-br dark:from-zinc-900/80 dark:via-zinc-950/80 dark:to-indigo-950/40 dark:shadow-[0_0_50px_-12px_rgba(99,102,241,0.45),inset_0_1px_0_0_rgba(255,255,255,0.06)]">
      <div className="mb-6 flex items-center justify-between px-6 sm:px-8">
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
          className="text-2xl font-black tracking-tight text-zinc-900 transition-colors hover:text-indigo-600 sm:text-3xl dark:text-zinc-50 dark:hover:text-indigo-300"
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

      <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-zinc-400 dark:text-zinc-500">
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
              holidayName={holidaysByDate.get(cell.dateKey) ?? null}
              onSelectTodo={onSelectTodo}
              onAddTodo={onAddTodo}
              onShowMore={onShowMore}
            />
          );
        })}
      </div>
    </div>
  );
}
