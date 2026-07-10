"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function addTodo(formData: FormData) {
  const text = String(formData.get("text") ?? "").trim();
  if (!text) return;

  const dueDate = String(formData.get("due_date") ?? "").trim();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("todos")
    .insert({ text, due_date: dueDate || null, user_id: user.id });

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
