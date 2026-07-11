"use server";

import { createClient } from "@/lib/supabase/server";
import webpush from "@/lib/web-push";

type SubscriptionPayload = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

export async function subscribeToPush(subscription: SubscriptionPayload) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "ログインが必要です" };

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: user.id,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth_key: subscription.keys.auth,
    },
    { onConflict: "endpoint" }
  );

  if (error) return { error: error.message };
  return { error: null };
}

export async function unsubscribeFromPush(endpoint: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("push_subscriptions")
    .delete()
    .eq("endpoint", endpoint)
    .eq("user_id", user.id);
}

export async function sendTestNotification() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "ログインが必要です" };

  const { data: subscriptions } = await supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth_key")
    .eq("user_id", user.id);

  if (!subscriptions || subscriptions.length === 0) {
    return { error: "通知が有効になっていません" };
  }

  const results = await Promise.allSettled(
    subscriptions.map((sub) =>
      webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth_key },
        },
        JSON.stringify({
          title: "ToDo. テスト通知",
          body: "通知が正しく届いています。",
          url: "/",
        })
      )
    )
  );

  const failed = results.filter((r) => r.status === "rejected");
  if (failed.length === results.length) {
    return { error: "通知の送信に失敗しました" };
  }
  return { error: null };
}
