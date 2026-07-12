"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isTodoColor } from "@/lib/todoColors";

export async function addTodo(formData: FormData) {
  const text = String(formData.get("text") ?? "").trim();
  if (!text) return;

  const dueDate = String(formData.get("due_date") ?? "").trim();
  const dueTime = String(formData.get("due_time") ?? "").trim();
  const colorInput = String(formData.get("color") ?? "").trim();
  const color = isTodoColor(colorInput) ? colorInput : null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("todos").insert({
    text,
    due_date: dueDate || null,
    // A time without a date has nothing to attach to, so only keep it
    // when a due date was actually set.
    due_time: dueDate && dueTime ? dueTime : null,
    color,
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

export async function updateTodo(
  id: string,
  updates: {
    text: string;
    due_date: string | null;
    due_time: string | null;
    color: string | null;
  }
) {
  const text = updates.text.trim();
  if (!text) return;

  const color = updates.color && isTodoColor(updates.color) ? updates.color : null;
  const dueDate = updates.due_date;
  // A time without a date has nothing to attach to, so only keep it when a
  // due date was actually set.
  const dueTime = dueDate && updates.due_time ? updates.due_time : null;

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

  const dueDateChanged = !!existing && existing.due_date !== dueDate;
  // "Postponed" means pushed back to a later date, not just any change
  // (moving a due date earlier, or clearing it, isn't procrastination).
  const isPostponed =
    dueDateChanged && dueDate !== null && !!existing?.due_date && dueDate > existing.due_date;

  await supabase
    .from("todos")
    .update({
      text,
      due_date: dueDate,
      due_time: dueTime,
      color,
      ...(dueDateChanged
        ? { day_before_reminder_sent: false, due_day_reminder_sent: false }
        : {}),
      ...(isPostponed ? { due_date_postponed_at: new Date().toISOString() } : {}),
    })
    .eq("id", id)
    .eq("user_id", user.id);

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
