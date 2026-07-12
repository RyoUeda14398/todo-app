"use client";

import { useOptimistic, useState, useSyncExternalStore, useTransition } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import TodoApp from "@/app/components/TodoApp";
import Calendar from "@/app/components/Calendar";
import KanbanBoard from "@/app/components/KanbanBoard";
import AiChat from "@/app/components/AiChat";
import NotificationSettingsLoader from "@/app/components/NotificationSettingsLoader";
import TodoDetailModal, { type TodoUpdates } from "@/app/components/TodoDetailModal";
import type { Todo, TodoStatus } from "@/app/components/TodoItem";
import type { ChatMessage } from "@/app/chat/actions";
import { addTodo, deleteTodo, updateDueDate, updateTodo, updateTodoStatus } from "@/app/todos/actions";
import { compareTodosByDueDate } from "@/lib/date";

type TodoBoardProps = {
  todos: Todo[];
  initialChatMessages: ChatMessage[];
};

type OptimisticAction =
  | { type: "add"; todo: Todo }
  | { type: "status"; id: string; status: TodoStatus }
  | { type: "delete"; id: string }
  | { type: "moveDate"; id: string; due_date: string | null }
  | { type: "edit"; id: string; updates: TodoUpdates };

function todosReducer(state: Todo[], action: OptimisticAction): Todo[] {
  switch (action.type) {
    case "add":
      return [...state, action.todo];
    case "status":
      return state.map((todo) =>
        todo.id === action.id ? { ...todo, status: action.status } : todo
      );
    case "delete":
      return state.filter((todo) => todo.id !== action.id);
    case "moveDate":
      return state.map((todo) =>
        todo.id === action.id ? { ...todo, due_date: action.due_date } : todo
      );
    case "edit":
      return state.map((todo) =>
        todo.id === action.id ? { ...todo, ...action.updates } : todo
      );
    default:
      return state;
  }
}

type DetailModalState = { id: string; mode: "view" | "edit" };

// Below Tailwind's `sm` breakpoint (640px), matching the rest of the app's
// existing mobile-specific treatments (e.g. the calendar's edge-to-edge width).
const MOBILE_QUERY = "(max-width: 639px)";

function subscribeToMobileQuery(onChange: () => void) {
  const mql = window.matchMedia(MOBILE_QUERY);
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
}

function getIsMobileSnapshot() {
  return window.matchMedia(MOBILE_QUERY).matches;
}

function getIsMobileServerSnapshot() {
  return false;
}

type ViewTab = "list-calendar" | "board-chat" | "list" | "calendar" | "board" | "chat";

const DESKTOP_TABS: { id: ViewTab; label: string }[] = [
  { id: "list-calendar", label: "リスト・カレンダー" },
  { id: "board-chat", label: "ボード・チャット" },
];

const MOBILE_TABS: { id: ViewTab; label: string }[] = [
  { id: "list", label: "リスト" },
  { id: "calendar", label: "カレンダー" },
  { id: "board", label: "ボード" },
  { id: "chat", label: "チャット" },
];

export default function TodoBoard({ todos, initialChatMessages }: TodoBoardProps) {
  const [optimisticTodos, applyOptimisticUpdate] = useOptimistic(
    todos,
    todosReducer
  );
  const sortedTodos = [...optimisticTodos].sort(compareTodosByDueDate);
  const [, startTransition] = useTransition();
  const [activeDragTodo, setActiveDragTodo] = useState<Todo | null>(null);
  const isMobile = useSyncExternalStore(
    subscribeToMobileQuery,
    getIsMobileSnapshot,
    getIsMobileServerSnapshot
  );
  const [activeView, setActiveView] = useState<ViewTab>("list-calendar");
  // The initial "list-calendar" default assumes desktop (matching the SSR
  // snapshot); once the real client width is known, or if a genuine window
  // resize crosses the mobile breakpoint, correct it to a tab that's valid
  // for the current tab set. Adjusting state during render (rather than in
  // an effect) is React's recommended pattern for this.
  const currentTabs = isMobile ? MOBILE_TABS : DESKTOP_TABS;
  if (!currentTabs.some((tab) => tab.id === activeView)) {
    setActiveView(isMobile ? "list" : "list-calendar");
  }
  const [detailModal, setDetailModal] = useState<DetailModalState | null>(null);
  const detailModalTodo = detailModal
    ? (sortedTodos.find((t) => t.id === detailModal.id) ?? null)
    : null;

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  );

  async function handleAdd(formData: FormData) {
    const text = String(formData.get("text") ?? "").trim();
    if (!text) return;

    const dueDate = String(formData.get("due_date") ?? "").trim();
    const dueTime = String(formData.get("due_time") ?? "").trim();
    const color = String(formData.get("color") ?? "").trim();

    applyOptimisticUpdate({
      type: "add",
      todo: {
        id: crypto.randomUUID(),
        text,
        status: "not_started",
        due_date: dueDate || null,
        due_time: dueDate && dueTime ? dueTime : null,
        color: color || null,
      },
    });
    await addTodo(formData);
  }

  function handleStatusChange(id: string, status: TodoStatus) {
    applyOptimisticUpdate({ type: "status", id, status });
  }

  function handleDelete(id: string) {
    startTransition(() => {
      applyOptimisticUpdate({ type: "delete", id });
    });
    deleteTodo(id);
  }

  function handleOpenEdit(id: string) {
    setDetailModal({ id, mode: "edit" });
  }

  function handleSaveEdit(id: string, updates: TodoUpdates) {
    startTransition(() => {
      applyOptimisticUpdate({ type: "edit", id, updates });
    });
    updateTodo(id, updates);
  }

  function handleDragStart(event: DragStartEvent) {
    const data = event.active.data.current as
      | { todoId?: string }
      | undefined;
    const todoId = data?.todoId ?? String(event.active.id);
    const todo = optimisticTodos.find((t) => t.id === todoId);
    setActiveDragTodo(todo ?? null);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveDragTodo(null);
    const { active, over } = event;
    if (!over) return;

    const activeData = active.data.current as
      | { type: string; todoId?: string }
      | undefined;
    const overData = over.data.current as
      | { type: string; dateKey?: string; status?: TodoStatus }
      | undefined;

    // Dropped onto a calendar day cell: update the due date, regardless of
    // whether the drag started from the list or from another calendar day.
    if (overData?.type === "calendar-day" && overData.dateKey) {
      const todoId =
        activeData?.type === "calendar-chip" && activeData.todoId
          ? activeData.todoId
          : String(active.id);
      const newDate = overData.dateKey;
      const todo = optimisticTodos.find((t) => t.id === todoId);
      if (!todo || todo.due_date === newDate) return;

      startTransition(() => {
        applyOptimisticUpdate({ type: "moveDate", id: todoId, due_date: newDate });
      });
      updateDueDate(todoId, newDate);
      return;
    }

    // Dropped onto a kanban board column: update the status.
    if (overData?.type === "kanban-column" && overData.status) {
      const todoId =
        activeData?.type === "kanban-card" && activeData.todoId
          ? activeData.todoId
          : String(active.id);
      const newStatus = overData.status;
      const todo = optimisticTodos.find((t) => t.id === todoId);
      if (!todo || todo.status === newStatus) return;

      startTransition(() => {
        applyOptimisticUpdate({ type: "status", id: todoId, status: newStatus });
      });
      updateTodoStatus(todoId, newStatus);
      return;
    }
  }

  const showList = isMobile ? activeView === "list" : activeView === "list-calendar";
  const showCalendar = isMobile ? activeView === "calendar" : activeView === "list-calendar";
  const showBoard = isMobile ? activeView === "board" : activeView === "board-chat";
  const showChat = isMobile ? activeView === "chat" : activeView === "board-chat";

  return (
    <DndContext
      id="todo-board-dnd"
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 p-5 sm:p-12">
        <NotificationSettingsLoader />

        <div className="flex flex-wrap gap-1 rounded-xl bg-zinc-100 p-1 dark:bg-white/5">
          {currentTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveView(tab.id)}
              className={`flex-1 whitespace-nowrap rounded-lg px-1.5 py-2.5 text-xs font-semibold transition-all sm:px-3 sm:text-sm ${
                activeView === tab.id
                  ? "bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-[0_0_20px_-4px_rgba(99,102,241,0.7)]"
                  : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex w-full flex-1 flex-col gap-10 lg:flex-row lg:items-start lg:gap-8">
          <div className={`w-full lg:w-[340px] lg:shrink-0 ${showList ? "" : "hidden"}`}>
            <TodoApp
              todos={sortedTodos}
              onAdd={handleAdd}
              onStatusChange={handleStatusChange}
              onEdit={handleOpenEdit}
            />
          </div>
          <div
            className={`-mx-5 w-[calc(100%+2.5rem)] flex-1 sm:mx-0 sm:w-full ${showCalendar ? "" : "hidden"}`}
          >
            <Calendar
              todos={sortedTodos}
              onSelectTodo={(id) => setDetailModal({ id, mode: "view" })}
            />
          </div>
        </div>

        <div className={showBoard ? "" : "hidden"}>
          <KanbanBoard todos={sortedTodos} onEdit={handleOpenEdit} />
        </div>
        <div className={showChat ? "" : "hidden"}>
          <AiChat initialMessages={initialChatMessages} />
        </div>
      </div>

      <DragOverlay>
        {activeDragTodo && (
          <div className="rotate-1 rounded-xl border border-indigo-300 bg-white px-4 py-3 text-sm font-medium text-zinc-900 shadow-2xl shadow-indigo-600/20 dark:border-indigo-700 dark:bg-zinc-900 dark:text-zinc-50">
            {activeDragTodo.text}
          </div>
        )}
      </DragOverlay>

      {detailModal && detailModalTodo && (
        <TodoDetailModal
          key={detailModal.id}
          todo={detailModalTodo}
          initialMode={detailModal.mode}
          onClose={() => setDetailModal(null)}
          onSave={handleSaveEdit}
          onDelete={handleDelete}
        />
      )}
    </DndContext>
  );
}
