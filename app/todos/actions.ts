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

  await supabase
    .from("todos")
    .insert({ text, due_date: dueDate || null, position, user_id: user.id });

  revalidatePath("/");
}

export async function toggleTodo(id: string, completed: boolean) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("todos")
    .update({ completed })
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

  await supabase
    .from("todos")
    .update({ due_date: dueDate })
    .eq("id", id)
    .eq("user_id", user.id);

  revalidatePath("/");
}
