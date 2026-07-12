import { ListTodo } from "lucide-react";
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
    .select("id, text, status, due_date, due_time, color")
    .order("due_date", { ascending: true, nullsFirst: false })
    .order("due_time", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });

  const { data: chatMessages } = await supabase
    .from("chat_messages")
    .select("id, role, content, is_proactive")
    .order("created_at", { ascending: true });

  return (
    <div className="relative flex min-h-screen flex-1 flex-col bg-gradient-to-b from-zinc-100/95 via-indigo-50/70 to-violet-50/90 dark:from-black dark:via-indigo-950/25 dark:to-black">
      <div className="pointer-events-none fixed inset-0 -z-20 overflow-hidden">
        <div className="animate-blob absolute -top-32 -left-24 h-96 w-96 rounded-full bg-indigo-400/40 blur-3xl dark:bg-indigo-600/20" />
        <div className="animate-blob absolute top-1/3 -right-24 h-80 w-80 rounded-full bg-violet-400/35 blur-3xl [animation-delay:-6s] dark:bg-violet-600/20" />
        <div className="animate-blob absolute bottom-0 left-1/4 h-72 w-72 rounded-full bg-fuchsia-300/30 blur-3xl [animation-delay:-11s] dark:bg-indigo-500/10" />
      </div>
      <ParticleBackgroundLoader />
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-indigo-300/40 bg-white/70 bg-[radial-gradient(ellipse_60%_100%_at_0%_0%,rgba(99,102,241,0.18),transparent),radial-gradient(ellipse_60%_100%_at_100%_0%,rgba(168,85,247,0.18),transparent)] px-5 py-4 backdrop-blur-2xl shadow-[0_2px_30px_-8px_rgba(99,102,241,0.5)] sm:px-10 dark:border-indigo-400/20 dark:bg-black/40 dark:bg-[radial-gradient(ellipse_60%_100%_at_0%_0%,rgba(99,102,241,0.3),transparent),radial-gradient(ellipse_60%_100%_at_100%_0%,rgba(168,85,247,0.3),transparent)]">
        <div className="relative flex items-center gap-2.5">
          <div
            className="absolute -left-3 -top-3 h-10 w-10 rounded-full bg-indigo-500/40 blur-xl dark:bg-indigo-400/40"
            aria-hidden
          />
          <ListTodo
            className="relative h-7 w-7 text-indigo-600 drop-shadow-[0_0_10px_rgba(99,102,241,0.6)] dark:text-indigo-400 dark:drop-shadow-[0_0_12px_rgba(129,140,248,0.7)]"
            aria-hidden
          />
          <span className="relative bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-3xl font-black tracking-tight text-transparent drop-shadow-[0_0_12px_rgba(99,102,241,0.45)] sm:text-4xl dark:from-indigo-300 dark:to-violet-300 dark:drop-shadow-[0_0_14px_rgba(129,140,248,0.6)]">
            ToDo
            <span className="text-indigo-600 dark:text-indigo-400">.</span>
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden items-center gap-2 rounded-full border border-indigo-200/60 bg-white/50 px-3 py-1.5 text-xs font-medium text-zinc-600 shadow-sm backdrop-blur-md sm:inline-flex dark:border-indigo-400/20 dark:bg-white/5 dark:text-zinc-300">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 shadow-[0_0_6px_2px_rgba(99,102,241,0.6)] dark:bg-indigo-400" />
            {user.email}
          </span>
          <ThemeToggle />
          <LogoutButton />
        </div>
      </header>

      <main className="flex flex-1 flex-col">
        <TodoBoard todos={todos ?? []} initialChatMessages={chatMessages ?? []} />
      </main>
    </div>
  );
}
