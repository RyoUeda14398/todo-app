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
import type { Todo } from "@/app/components/TodoItem";
import { addTodo, reorderTodos, updateDueDate } from "@/app/todos/actions";

type TodoBoardProps = {
  todos: Todo[];
};

type OptimisticAction =
  | { type: "add"; todo: Todo }
  | { type: "toggle"; id: string; completed: boolean }
  | { type: "delete"; id: string }
  | { type: "reorder"; todos: Todo[] }
  | { type: "moveDate"; id: string; due_date: string | null };

function todosReducer(state: Todo[], action: OptimisticAction): Todo[] {
  switch (action.type) {
    case "add":
      return [...state, action.todo];
    case "toggle":
      return state.map((todo) =>
        todo.id === action.id ? { ...todo, completed: action.completed } : todo
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

export default function TodoBoard({ todos }: TodoBoardProps) {
  const [optimisticTodos, applyOptimisticUpdate] = useOptimistic(
    todos,
    todosReducer
  );
  const [, startTransition] = useTransition();
  const [activeDragTodo, setActiveDragTodo] = useState<Todo | null>(null);

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
        completed: false,
        due_date: dueDate || null,
      },
    });
    await addTodo(formData);
  }

  function handleToggle(id: string, completed: boolean) {
    applyOptimisticUpdate({ type: "toggle", id, completed });
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
      | { type: string; dateKey?: string }
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
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-10 p-5 sm:p-12 lg:flex-row lg:items-start lg:gap-8">
        <div className="w-full lg:w-[380px] lg:shrink-0">
          <TodoApp
            todos={optimisticTodos}
            onAdd={handleAdd}
            onToggle={handleToggle}
            onDelete={handleDelete}
          />
        </div>
        <div className="w-full flex-1">
          <Calendar todos={optimisticTodos} />
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
