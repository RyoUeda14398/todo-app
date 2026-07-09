"use client";

import TodoItem, { type Todo } from "@/app/components/TodoItem";
import { addTodo } from "@/app/todos/actions";

type TodoAppProps = {
  todos: Todo[];
};

export default function TodoApp({ todos }: TodoAppProps) {
  const remainingCount = todos.filter((todo) => !todo.completed).length;

  return (
    <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-zinc-50 p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <h1 className="mb-6 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        ToDoリスト
      </h1>

      <form action={addTodo} className="mb-4 flex gap-2">
        <input
          type="text"
          name="text"
          required
          placeholder="やることを入力..."
          className="flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
        <button
          type="submit"
          className="rounded-lg bg-zinc-900 px-4 py-2 font-medium text-white hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          追加
        </button>
      </form>

      {todos.length === 0 ? (
        <p className="py-8 text-center text-zinc-400 dark:text-zinc-600">
          まだToDoがありません
        </p>
      ) : (
        <>
          <ul className="flex flex-col gap-2">
            {todos.map((todo) => (
              <TodoItem key={todo.id} todo={todo} />
            ))}
          </ul>
          <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
            残り {remainingCount} / {todos.length} 件
          </p>
        </>
      )}
    </div>
  );
}
