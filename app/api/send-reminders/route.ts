import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import webpush from "@/lib/web-push";

type DueReminder = {
  todo_id: string;
  todo_text: string;
  reminder_type: "due_today" | "day_before";
  subscription_id: string;
  endpoint: string;
  p256dh: string;
  auth_key: string;
};

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data: reminders, error } = await supabase.rpc("get_due_reminders", {
    p_secret: process.env.CRON_SECRET,
  });

  if (error) {
    console.error("Failed to fetch due reminders:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const grouped = new Map<string, DueReminder[]>();
  for (const reminder of (reminders ?? []) as DueReminder[]) {
    const key = `${reminder.todo_id}:${reminder.reminder_type}`;
    const group = grouped.get(key);
    if (group) {
      group.push(reminder);
    } else {
      grouped.set(key, [reminder]);
    }
  }

  let sentCount = 0;
  let failedCount = 0;

  for (const [key, group] of grouped) {
    let anySucceeded = false;

    for (const reminder of group) {
      const payload = JSON.stringify({
        title:
          reminder.reminder_type === "due_today"
            ? "今日が締切です"
            : "明日が締切です",
        body: reminder.todo_text,
        url: "/",
      });

      try {
        await webpush.sendNotification(
          {
            endpoint: reminder.endpoint,
            keys: { p256dh: reminder.p256dh, auth: reminder.auth_key },
          },
          payload
        );
        anySucceeded = true;
        sentCount++;
      } catch (err) {
        failedCount++;
        const statusCode = (err as { statusCode?: number })?.statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await supabase.rpc("delete_push_subscription", {
            p_secret: process.env.CRON_SECRET,
            p_subscription_id: reminder.subscription_id,
          });
        } else {
          console.error("Failed to send push notification:", err);
        }
      }
    }

    if (anySucceeded) {
      const [todoId, type] = key.split(":");
      await supabase.rpc("mark_reminder_sent", {
        p_secret: process.env.CRON_SECRET,
        p_todo_id: todoId,
        p_type: type,
      });
    }
  }

  return NextResponse.json({ sent: sentCount, failed: failedCount });
}
