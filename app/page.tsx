import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import TodoApp from "@/app/components/TodoApp";
import Calendar from "@/app/components/Calendar";
import LogoutButton from "@/app/components/LogoutButton";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: todos } = await supabase
    .from("todos")
    .select("id, text, completed, due_date")
    .order("created_at", { ascending: true });

  return (
    <div className="flex min-h-screen flex-1 flex-col bg-gradient-to-b from-zinc-100 via-zinc-100 to-indigo-50 dark:from-black dark:via-black dark:to-indigo-950/30">
      <header className="flex items-center justify-between border-b border-zinc-200 bg-white/70 px-4 py-3 backdrop-blur-sm sm:px-8 dark:border-zinc-800 dark:bg-black/50">
        <div className="flex items-center gap-2">
          <span className="text-xl" aria-hidden>
            📝
          </span>
          <span className="font-semibold text-zinc-900 dark:text-zinc-50">
            ToDoアプリ
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-zinc-500 sm:inline dark:text-zinc-400">
            {user.email}
          </span>
          <LogoutButton />
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 p-4 sm:p-8 lg:flex-row lg:items-start">
        <div className="w-full lg:w-[420px] lg:shrink-0">
          <TodoApp todos={todos ?? []} />
        </div>
        <div className="w-full flex-1">
          <Calendar todos={todos ?? []} />
        </div>
      </main>
    </div>
  );
}
