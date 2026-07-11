"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function getNextPosition(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
) {
  const { data } = await supabase
    .from("todos")
    .select("position")
    .eq("user_id", userId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data?.position ?? -1) + 1;
}

export async function addTodo(formData: FormData) {
  const text = String(formData.get("text") ?? "").trim();
  if (!text) return;

  const dueDate = String(formData.get("due_date") ?? "").trim();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const position = await getNextPosition(supabase, user.id);

  await supabase.from("todos").insert({
    text,
    due_date: dueDate || null,
    position,
    status: "not_started",
    user_id: user.id,
  });

  revalidatePath("/");
}

export async function updateTodoStatus(
  id: string,
  status: "not_started" | "in_progress" | "completed"
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("todos")
    .update({
      status,
      completed_at: status === "completed" ? new Date().toISOString() : null,
    })
    .eq("id", id)
    .eq("user_id", user.id);

  revalidatePath("/");
}

export async function deleteTodo(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("todos").delete().eq("id", id).eq("user_id", user.id);

  revalidatePath("/");
}

export async function reorderTodos(orderedIds: string[]) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await Promise.all(
    orderedIds.map((id, index) =>
      supabase
        .from("todos")
        .update({ position: index })
        .eq("id", id)
        .eq("user_id", user.id)
    )
  );

  revalidatePath("/");
}

export async function updateDueDate(id: string, dueDate: string | null) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data: existing } = await supabase
    .from("todos")
    .select("due_date")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  // "Postponed" means pushed back to a later date, not just any change
  // (moving a due date earlier, or clearing it, isn't procrastination).
  const isPostponed =
    dueDate !== null && !!existing?.due_date && dueDate > existing.due_date;

  await supabase
    .from("todos")
    .update({
      due_date: dueDate,
      day_before_reminder_sent: false,
      due_day_reminder_sent: false,
      ...(isPostponed ? { due_date_postponed_at: new Date().toISOString() } : {}),
    })
    .eq("id", id)
    .eq("user_id", user.id);

  revalidatePath("/");
}
