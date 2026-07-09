import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import TodoApp from "@/app/components/TodoApp";
import LogoutButton from "@/app/components/LogoutButton";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex flex-1 flex-col items-center bg-zinc-100 p-6 dark:bg-black">
      <div className="mb-4 flex w-full max-w-md items-center justify-between">
        <span className="text-sm text-zinc-500 dark:text-zinc-400">
          {user.email}
        </span>
        <LogoutButton />
      </div>
      <TodoApp />
    </div>
  );
}
