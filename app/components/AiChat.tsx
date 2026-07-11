"use client";

import { useEffect, useRef, useState, useSyncExternalStore, useTransition } from "react";
import { Mic, Sparkles } from "lucide-react";
import {
  sendChatMessage,
  confirmDeleteTodo,
  confirmAddSubtasks,
  checkProactiveSuggestion,
  type ChatMessage,
  type PendingDeletion,
  type PendingSubtaskSuggestion,
} from "@/app/chat/actions";

// The Web Speech API (SpeechRecognition) isn't part of TypeScript's standard
// DOM types, since it's a non-standardized browser feature (Chrome/Edge
// support it directly, Safari partially, Firefox not at all). These are
// minimal local type declarations covering only what this component uses.
type SpeechRecognitionResult = { transcript: string };
type SpeechRecognitionResultList = {
  length: number;
  [index: number]: { length: number; [index: number]: SpeechRecognitionResult };
};
type SpeechRecognitionEvent = Event & {
  resultIndex: number;
  results: SpeechRecognitionResultList;
};
type SpeechRecognitionErrorEvent = Event & { error: string };
type SpeechRecognitionInstance = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
};
type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;
type WindowWithSpeechRecognition = Window &
  typeof globalThis & {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };

type UiPendingDeletion = PendingDeletion & {
  resolution: "pending" | "deleted" | "cancelled";
};

type UiPendingSubtaskSuggestion = PendingSubtaskSuggestion & {
  resolution: "pending" | "added" | "cancelled";
};

type UiMessage = ChatMessage & {
  pendingDeletions?: UiPendingDeletion[];
  pendingSubtaskSuggestions?: UiPendingSubtaskSuggestion[];
};

// Whether the browser supports voice input never changes during the page's
// lifetime, so subscribe() never needs to notify of a change — it only
// exists to satisfy useSyncExternalStore's signature. The server always
// reports "unsupported" (getServerSnapshot), since this is a browser-only
// API; the real answer is read once on the client via getSnapshot.
function subscribeToNothing() {
  return () => {};
}
function getVoiceSupportSnapshot() {
  const w = window as WindowWithSpeechRecognition;
  return Boolean(w.SpeechRecognition || w.webkitSpeechRecognition);
}
function getVoiceSupportServerSnapshot() {
  return false;
}

type AiChatProps = {
  initialMessages: ChatMessage[];
};

export default function AiChat({ initialMessages }: AiChatProps) {
  const [messages, setMessages] = useState<UiMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  // Voice input availability depends on the browser (Chrome/Edge support it,
  // Safari partially, Firefox not at all), which we can only know once we're
  // running in the browser — useSyncExternalStore lets us read that safely
  // without a server/client hydration mismatch (same pattern as ThemeToggle).
  const voiceSupported = useSyncExternalStore(
    subscribeToNothing,
    getVoiceSupportSnapshot,
    getVoiceSupportServerSnapshot
  );

  // Check once, when the chat panel first mounts, whether the AI has
  // something worth mentioning on its own (a growing backlog, overdue
  // todos). The server action itself enforces a cooldown, so this being
  // called again on every page load doesn't cause repeated messages.
  useEffect(() => {
    // No cleanup/cancellation here on purpose: this is a one-shot check that
    // outlives the component either way (the server action's DB insert
    // can't be "undone" by the component unmounting), and AiChat itself
    // stays mounted for the page's lifetime (tabs hide it, never unmount
    // it — see TodoBoard's tab switching).
    checkProactiveSuggestion()
      .then((suggestion) => {
        if (suggestion) {
          setMessages((prev) => [...prev, suggestion]);
        }
      })
      .catch((e) => {
        console.error("Proactive suggestion check failed:", e);
      });
  }, []);

  function handleToggleListening() {
    if (isListening) {
      recognitionRef.current?.stop();
      return;
    }

    const w = window as WindowWithSpeechRecognition;
    const SpeechRecognitionCtor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) return;

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = "ja-JP";
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onresult = (event) => {
      let transcript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      setInput(transcript);
    };
    recognition.onerror = () => {
      setIsListening(false);
    };
    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    setIsListening(true);
    recognition.start();
  }

  function handleSubmit(formData: FormData) {
    const text = String(formData.get("message") ?? "").trim();
    if (!text) return;

    setError(null);
    setInput("");

    const userMessage: UiMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
      is_proactive: false,
    };
    const historyForRequest = messages.map(({ id, role, content, is_proactive }) => ({
      id,
      role,
      content,
      is_proactive,
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
        is_proactive: false,
        pendingDeletions: result.pendingDeletions.map((d) => ({
          ...d,
          resolution: "pending",
        })),
        pendingSubtaskSuggestions: result.pendingSubtaskSuggestions.map((s) => ({
          ...s,
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

  function handleConfirmAddSubtasks(messageId: string, suggestionId: string) {
    const message = messages.find((m) => m.id === messageId);
    const suggestion = message?.pendingSubtaskSuggestions?.find(
      (s) => s.suggestionId === suggestionId
    );
    if (!suggestion) return;

    startTransition(async () => {
      await confirmAddSubtasks(suggestion.subtasks);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? {
                ...m,
                pendingSubtaskSuggestions: m.pendingSubtaskSuggestions?.map((s) =>
                  s.suggestionId === suggestionId ? { ...s, resolution: "added" } : s
                ),
              }
            : m
        )
      );
    });
  }

  function handleCancelSubtasks(messageId: string, suggestionId: string) {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId
          ? {
              ...m,
              pendingSubtaskSuggestions: m.pendingSubtaskSuggestions?.map((s) =>
                s.suggestionId === suggestionId ? { ...s, resolution: "cancelled" } : s
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
                {m.is_proactive && (
                  <p className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-indigo-500 dark:text-indigo-400">
                    <Sparkles size={11} />
                    AIからの気づき
                  </p>
                )}
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
                {m.pendingSubtaskSuggestions?.map((s) => (
                  <div
                    key={s.suggestionId}
                    className="mt-2 rounded-xl border border-indigo-200 bg-indigo-50 p-2.5 dark:border-indigo-400/30 dark:bg-indigo-950/40"
                  >
                    <p className="mb-2 text-xs font-medium text-indigo-700 dark:text-indigo-300">
                      以下のサブタスクを登録しますか?
                    </p>
                    <ul className="mb-2 list-inside list-disc text-xs text-indigo-900 dark:text-indigo-200">
                      {s.subtasks.map((subtask, i) => (
                        <li key={i}>
                          {subtask.text}
                          {subtask.due_date ? `(締切: ${subtask.due_date})` : ""}
                        </li>
                      ))}
                    </ul>
                    {s.resolution === "pending" && (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => handleConfirmAddSubtasks(m.id, s.suggestionId)}
                          className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white transition-all hover:bg-indigo-700 disabled:opacity-50"
                        >
                          登録する
                        </button>
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => handleCancelSubtasks(m.id, s.suggestionId)}
                          className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-600 transition-all hover:bg-zinc-100 disabled:opacity-50 dark:border-white/20 dark:text-zinc-300 dark:hover:bg-white/10"
                        >
                          登録しない
                        </button>
                      </div>
                    )}
                    {s.resolution === "added" && (
                      <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400">
                        登録しました
                      </p>
                    )}
                    {s.resolution === "cancelled" && (
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
        {voiceSupported && (
          <button
            type="button"
            aria-label={isListening ? "音声入力を停止する" : "音声入力を開始する"}
            onClick={handleToggleListening}
            className={`flex shrink-0 items-center justify-center rounded-xl border px-3 py-2 transition-all ${
              isListening
                ? "animate-pulse border-red-400 bg-red-50 text-red-600 dark:border-red-400/40 dark:bg-red-950/40 dark:text-red-400"
                : "border-zinc-300 bg-white text-zinc-500 hover:text-indigo-600 dark:border-white/15 dark:bg-white/5 dark:text-zinc-300 dark:hover:text-indigo-400"
            }`}
          >
            <Mic size={18} />
          </button>
        )}
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
