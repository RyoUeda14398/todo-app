import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import TodoBoard from "@/app/components/TodoBoard";
import LogoutButton from "@/app/components/LogoutButton";
import ThemeToggle from "@/app/components/ThemeToggle";
import ParticleBackgroundLoader from "@/app/components/ParticleBackgroundLoader";

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
    .order("position", { ascending: true });

  return (
    <div className="flex min-h-screen flex-1 flex-col bg-gradient-to-b from-zinc-100 via-zinc-100 to-indigo-50 dark:from-black dark:via-indigo-950/25 dark:to-black">
      <ParticleBackgroundLoader />
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-zinc-200/80 bg-white/80 px-4 py-3.5 shadow-sm backdrop-blur-md sm:px-8 dark:border-white/10 dark:bg-black/50">
        <div className="flex items-center gap-2">
          <span className="text-xl" aria-hidden>
            📝
          </span>
          <span className="text-lg font-bold tracking-tight text-zinc-900 dark:bg-gradient-to-r dark:from-indigo-300 dark:to-violet-300 dark:bg-clip-text dark:text-transparent">
            ToDo
            <span className="text-indigo-600 dark:text-indigo-400">.</span>
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-zinc-500 sm:inline dark:text-zinc-400">
            {user.email}
          </span>
          <ThemeToggle />
          <LogoutButton />
        </div>
      </header>

      <main className="flex flex-1 flex-col">
        <TodoBoard todos={todos ?? []} />
      </main>
    </div>
  );
}
