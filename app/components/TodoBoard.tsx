"use client";

import { useOptimistic, useState, useTransition } from "react";
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
import { arrayMove } from "@dnd-kit/sortable";
import TodoApp from "@/app/components/TodoApp";
import Calendar from "@/app/components/Calendar";
import KanbanBoard from "@/app/components/KanbanBoard";
import AiChat from "@/app/components/AiChat";
import NotificationSettingsLoader from "@/app/components/NotificationSettingsLoader";
import type { Todo, TodoStatus } from "@/app/components/TodoItem";
import type { ChatMessage } from "@/app/chat/actions";
import { addTodo, reorderTodos, updateDueDate, updateTodoStatus } from "@/app/todos/actions";

type TodoBoardProps = {
  todos: Todo[];
  initialChatMessages: ChatMessage[];
};

type OptimisticAction =
  | { type: "add"; todo: Todo }
  | { type: "status"; id: string; status: TodoStatus }
  | { type: "delete"; id: string }
  | { type: "reorder"; todos: Todo[] }
  | { type: "moveDate"; id: string; due_date: string | null };

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
    case "reorder":
      return action.todos;
    case "moveDate":
      return state.map((todo) =>
        todo.id === action.id ? { ...todo, due_date: action.due_date } : todo
      );
    default:
      return state;
  }
}

type ViewTab = "list" | "board-chat";

const VIEW_TABS: { id: ViewTab; label: string }[] = [
  { id: "list", label: "リスト・カレンダー" },
  { id: "board-chat", label: "ボード・チャット" },
];

export default function TodoBoard({ todos, initialChatMessages }: TodoBoardProps) {
  const [optimisticTodos, applyOptimisticUpdate] = useOptimistic(
    todos,
    todosReducer
  );
  const [, startTransition] = useTransition();
  const [activeDragTodo, setActiveDragTodo] = useState<Todo | null>(null);
  const [activeView, setActiveView] = useState<ViewTab>("list");

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  );

  async function handleAdd(formData: FormData) {
    const text = String(formData.get("text") ?? "").trim();
    if (!text) return;

    const dueDate = String(formData.get("due_date") ?? "").trim();

    applyOptimisticUpdate({
      type: "add",
      todo: {
        id: crypto.randomUUID(),
        text,
        status: "not_started",
        due_date: dueDate || null,
      },
    });
    await addTodo(formData);
  }

  function handleStatusChange(id: string, status: TodoStatus) {
    applyOptimisticUpdate({ type: "status", id, status });
  }

  function handleDelete(id: string) {
    applyOptimisticUpdate({ type: "delete", id });
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

    // Otherwise: reordering within the todo list.
    if (activeData?.type === "list-item" && active.id !== over.id) {
      const oldIndex = optimisticTodos.findIndex((t) => t.id === active.id);
      const newIndex = optimisticTodos.findIndex((t) => t.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;

      const newOrder = arrayMove(optimisticTodos, oldIndex, newIndex);
      startTransition(() => {
        applyOptimisticUpdate({ type: "reorder", todos: newOrder });
      });
      reorderTodos(newOrder.map((t) => t.id));
    }
  }

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

        <div className="flex gap-1 rounded-xl bg-zinc-100 p-1 dark:bg-white/5">
          {VIEW_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveView(tab.id)}
              className={`flex-1 rounded-lg px-3 py-2.5 text-sm font-semibold transition-all ${
                activeView === tab.id
                  ? "bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-[0_0_20px_-4px_rgba(99,102,241,0.7)]"
                  : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className={activeView === "list" ? "contents" : "hidden"}>
          <div className="flex w-full flex-1 flex-col gap-10 lg:flex-row lg:items-start lg:gap-8">
            <div className="w-full lg:w-[380px] lg:shrink-0">
              <TodoApp
                todos={optimisticTodos}
                onAdd={handleAdd}
                onStatusChange={handleStatusChange}
                onDelete={handleDelete}
              />
            </div>
            <div className="w-full flex-1">
              <Calendar todos={optimisticTodos} />
            </div>
          </div>
        </div>

        <div className={activeView === "board-chat" ? "contents" : "hidden"}>
          <KanbanBoard todos={optimisticTodos} />
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
    </DndContext>
  );
}
