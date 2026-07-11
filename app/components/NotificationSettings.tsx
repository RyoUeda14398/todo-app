"use client";

import { useEffect, useState, useTransition } from "react";
import {
  subscribeToPush,
  unsubscribeFromPush,
  sendTestNotification,
} from "@/app/notifications/actions";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function NotificationSettings() {
  const [isSupported] = useState(
    () => "serviceWorker" in navigator && "PushManager" in window
  );
  const [isIOS] = useState(() => /iPad|iPhone|iPod/.test(navigator.userAgent));
  const [isStandalone] = useState(
    () => window.matchMedia("(display-mode: standalone)").matches
  );
  const [subscription, setSubscription] = useState<PushSubscription | null>(
    null
  );
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!isSupported) return;

    navigator.serviceWorker.register("/sw.js").then(async (registration) => {
      const existing = await registration.pushManager.getSubscription();
      setSubscription(existing);
    });
  }, [isSupported]);

  async function handleEnable() {
    setMessage(null);
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      setMessage("通知が許可されませんでした");
      return;
    }

    const registration = await navigator.serviceWorker.ready;
    const sub = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
      ),
    });
    setSubscription(sub);

    const json = sub.toJSON();
    startTransition(async () => {
      const result = await subscribeToPush({
        endpoint: json.endpoint!,
        keys: { p256dh: json.keys!.p256dh!, auth: json.keys!.auth! },
      });
      setMessage(result?.error ?? "通知を有効にしました");
    });
  }

  async function handleDisable() {
    if (!subscription) return;
    setMessage(null);
    const endpoint = subscription.endpoint;
    await subscription.unsubscribe();
    setSubscription(null);

    startTransition(async () => {
      await unsubscribeFromPush(endpoint);
      setMessage("通知を無効にしました");
    });
  }

  function handleTest() {
    setMessage(null);
    startTransition(async () => {
      const result = await sendTestNotification();
      setMessage(result?.error ?? "テスト通知を送信しました");
    });
  }

  if (!isSupported) return null;

  return (
    <div className="w-full rounded-3xl border-2 border-indigo-200/70 bg-gradient-to-br from-white via-indigo-50/50 to-violet-50/70 p-6 shadow-[0_25px_60px_-20px_rgba(99,102,241,0.35)] backdrop-blur-2xl dark:border-indigo-400/40 dark:bg-gradient-to-br dark:from-zinc-900/80 dark:via-zinc-950/80 dark:to-indigo-950/40 dark:shadow-[0_0_50px_-12px_rgba(99,102,241,0.45),inset_0_1px_0_0_rgba(255,255,255,0.06)]">
      <h2 className="mb-3 text-lg font-bold text-zinc-900 dark:text-zinc-50">
        🔔 締切リマインダー通知
      </h2>

      {isIOS && !isStandalone ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          iPhoneでは、このページを「ホーム画面に追加」してから、そのアイコンで開くと通知を設定できます。
        </p>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          {subscription ? (
            <>
              <button
                type="button"
                onClick={handleDisable}
                disabled={isPending}
                className="rounded-xl border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-600 transition-all hover:bg-zinc-100 disabled:opacity-50 dark:border-white/15 dark:text-zinc-300 dark:hover:bg-white/10"
              >
                通知をオフにする
              </button>
              <button
                type="button"
                onClick={handleTest}
                disabled={isPending}
                className="rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-[0_0_20px_-4px_rgba(99,102,241,0.6)] transition-all hover:-translate-y-0.5 hover:shadow-[0_0_30px_-4px_rgba(99,102,241,0.8)] disabled:opacity-50"
              >
                テスト通知を送る
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={handleEnable}
              disabled={isPending}
              className="rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-[0_0_20px_-4px_rgba(99,102,241,0.6)] transition-all hover:-translate-y-0.5 hover:shadow-[0_0_30px_-4px_rgba(99,102,241,0.8)] disabled:opacity-50"
            >
              通知をオンにする
            </button>
          )}
        </div>
      )}

      {message && (
        <p className="mt-3 text-sm text-indigo-600 dark:text-indigo-400">
          {message}
        </p>
      )}
    </div>
  );
}
