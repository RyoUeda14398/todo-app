import TodoApp from "@/app/components/TodoApp";

export default function Home() {
  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-100 p-6 dark:bg-black">
      <TodoApp />
    </div>
  );
}
