"use client";

import { useState, useTransition } from "react";
import {
  sendChatMessage,
  confirmDeleteTodo,
  type ChatMessage,
  type PendingDeletion,
} from "@/app/chat/actions";

type UiPendingDeletion = PendingDeletion & {
  resolution: "pending" | "deleted" | "cancelled";
};

type UiMessage = ChatMessage & {
  pendingDeletions?: UiPendingDeletion[];
};

type AiChatProps = {
  initialMessages: ChatMessage[];
};

export default function AiChat({ initialMessages }: AiChatProps) {
  const [messages, setMessages] = useState<UiMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    const text = String(formData.get("message") ?? "").trim();
    if (!text) return;

    setError(null);
    setInput("");

    const userMessage: UiMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
    };
    const historyForRequest = messages.map(({ id, role, content }) => ({
      id,
      role,
      content,
    }));
    setMessages((prev) => [...prev, userMessage]);

    startTransition(async () => {
      const result = await sendChatMessage(historyForRequest, text);

      if (result.error || !result.reply) {
        setError(result.error ?? "エラーが発生しました。");
        return;
      }

      const assistantMessage: UiMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: result.reply,
        pendingDeletions: result.pendingDeletions.map((d) => ({
          ...d,
          resolution: "pending",
        })),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    });
  }

  function handleConfirmDelete(messageId: string, todoId: string) {
    startTransition(async () => {
      await confirmDeleteTodo(todoId);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? {
                ...m,
                pendingDeletions: m.pendingDeletions?.map((d) =>
                  d.todoId === todoId ? { ...d, resolution: "deleted" } : d
                ),
              }
            : m
        )
      );
    });
  }

  function handleCancelDelete(messageId: string, todoId: string) {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId
          ? {
              ...m,
              pendingDeletions: m.pendingDeletions?.map((d) =>
                d.todoId === todoId ? { ...d, resolution: "cancelled" } : d
              ),
            }
          : m
      )
    );
  }

  return (
    <div className="w-full rounded-3xl border-2 border-indigo-200/70 bg-gradient-to-br from-white via-indigo-50/50 to-violet-50/70 p-6 shadow-[0_25px_60px_-20px_rgba(99,102,241,0.35)] backdrop-blur-2xl sm:p-8 dark:border-indigo-400/40 dark:bg-gradient-to-br dark:from-zinc-900/80 dark:via-zinc-950/80 dark:to-indigo-950/40 dark:shadow-[0_0_50px_-12px_rgba(99,102,241,0.45),inset_0_1px_0_0_rgba(255,255,255,0.06)]">
      <h2 className="mb-6 text-2xl font-black tracking-tight text-zinc-900 sm:text-3xl dark:text-zinc-50">
        💬 AIに相談する
      </h2>

      <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-zinc-50/60 p-4 dark:border-white/20 dark:bg-white/[0.03]">
        {messages.length === 0 ? (
          <p className="py-6 text-center text-sm text-zinc-400 dark:text-zinc-600">
            「今日は何をすべき?」「買い物のタスクを来週に延期して」のように話しかけてみてください
          </p>
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                  m.role === "user"
                    ? "bg-gradient-to-br from-indigo-500 to-violet-600 text-white"
                    : "border border-indigo-100 bg-white text-zinc-900 dark:border-indigo-400/25 dark:bg-white/[0.06] dark:text-zinc-50"
                }`}
              >
                <p className="whitespace-pre-wrap break-words">{m.content}</p>
                {m.pendingDeletions?.map((d) => (
                  <div
                    key={d.todoId}
                    className="mt-2 rounded-xl border border-red-200 bg-red-50 p-2.5 dark:border-red-400/30 dark:bg-red-950/40"
                  >
                    <p className="mb-2 text-xs text-red-700 dark:text-red-300">
                      「{d.todoText}」を削除しますか?
                    </p>
                    {d.resolution === "pending" && (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => handleConfirmDelete(m.id, d.todoId)}
                          className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition-all hover:bg-red-700 disabled:opacity-50"
                        >
                          削除する
                        </button>
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => handleCancelDelete(m.id, d.todoId)}
                          className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-600 transition-all hover:bg-zinc-100 disabled:opacity-50 dark:border-white/20 dark:text-zinc-300 dark:hover:bg-white/10"
                        >
                          しない
                        </button>
                      </div>
                    )}
                    {d.resolution === "deleted" && (
                      <p className="text-xs font-medium text-red-600 dark:text-red-400">
                        削除しました
                      </p>
                    )}
                    {d.resolution === "cancelled" && (
                      <p className="text-xs text-zinc-400 dark:text-zinc-500">
                        キャンセルしました
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {error && (
        <p className="mb-3 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      <form action={handleSubmit} className="flex gap-2">
        <input
          type="text"
          name="message"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          required
          placeholder="今日は何をすべき?"
          className="min-w-0 flex-1 rounded-xl border border-zinc-300 bg-white px-3 py-2 text-zinc-900 placeholder:text-zinc-400 transition-colors focus:border-indigo-500 focus:outline-none dark:border-white/15 dark:bg-white/5 dark:text-zinc-50 dark:hover:border-white/25"
        />
        <button
          type="submit"
          disabled={isPending}
          className="rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 px-6 py-2 text-sm font-semibold text-white shadow-[0_0_20px_-4px_rgba(99,102,241,0.6)] transition-all hover:-translate-y-0.5 hover:shadow-[0_0_30px_-4px_rgba(99,102,241,0.8)] active:translate-y-0 active:scale-95 disabled:opacity-50"
        >
          {isPending ? "考え中..." : "送信"}
        </button>
      </form>
    </div>
  );
}
