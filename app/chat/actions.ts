"use server";

import { anthropic } from "@ai-sdk/anthropic";
import { generateText, tool, stepCountIs } from "ai";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getTodayInJST } from "@/lib/date";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  is_proactive: boolean;
};

export type PendingDeletion = {
  todoId: string;
  todoText: string;
};

export type SuggestedSubtask = {
  text: string;
  due_date: string | null;
};

export type PendingSubtaskSuggestion = {
  suggestionId: string;
  subtasks: SuggestedSubtask[];
};

export type SendChatMessageResult = {
  error: string | null;
  reply: string | null;
  pendingDeletions: PendingDeletion[];
  pendingSubtaskSuggestions: PendingSubtaskSuggestion[];
};

export async function loadChatHistory(): Promise<ChatMessage[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("chat_messages")
    .select("id, role, content, is_proactive")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  return (data ?? []) as ChatMessage[];
}

export async function sendChatMessage(
  history: ChatMessage[],
  message: string
): Promise<SendChatMessageResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      error: "ログインが必要です。",
      reply: null,
      pendingDeletions: [],
      pendingSubtaskSuggestions: [],
    };
  }

  const trimmed = message.trim();
  if (!trimmed) {
    return {
      error: "メッセージを入力してください。",
      reply: null,
      pendingDeletions: [],
      pendingSubtaskSuggestions: [],
    };
  }

  const today = getTodayInJST();

  const tools = {
    listTodos: tool({
      description:
        "現在のユーザーのToDo一覧を取得する。特定のToDoを名前から探すときは、まずこれを呼ぶこと。",
      inputSchema: z.object({}),
      execute: async () => {
        const { data } = await supabase
          .from("todos")
          .select("id, text, status, due_date")
          .eq("user_id", user.id)
          .order("due_date", { ascending: true, nullsFirst: false })
          .order("created_at", { ascending: true });
        return data ?? [];
      },
    }),
    addTodo: tool({
      description: "新しいToDoを追加する。",
      inputSchema: z.object({
        text: z.string().describe("ToDoの内容"),
        due_date: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .nullable()
          .describe("締切日(YYYY-MM-DD形式)。締切がなければnull"),
      }),
      execute: async ({ text, due_date }) => {
        await supabase.from("todos").insert({
          text,
          due_date,
          status: "not_started",
          user_id: user.id,
        });
        return { success: true, text, due_date };
      },
    }),
    updateTodoStatus: tool({
      description: "既存のToDoの状態を変更する(未着手/進行中/完了)。",
      inputSchema: z.object({
        todoId: z.string().describe("listTodosで取得したToDoのid"),
        status: z.enum(["not_started", "in_progress", "completed"]),
      }),
      execute: async ({ todoId, status }) => {
        const { error } = await supabase
          .from("todos")
          .update({
            status,
            completed_at: status === "completed" ? new Date().toISOString() : null,
          })
          .eq("id", todoId)
          .eq("user_id", user.id);
        return { success: !error };
      },
    }),
    updateDueDate: tool({
      description: "既存のToDoの締切日を変更する。",
      inputSchema: z.object({
        todoId: z.string().describe("listTodosで取得したToDoのid"),
        due_date: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .nullable()
          .describe("新しい締切日(YYYY-MM-DD形式)。締切をなくす場合はnull"),
      }),
      execute: async ({ todoId, due_date }) => {
        const { data: existing } = await supabase
          .from("todos")
          .select("due_date")
          .eq("id", todoId)
          .eq("user_id", user.id)
          .maybeSingle();

        // "Postponed" means pushed back to a later date, not just any
        // change (moving a due date earlier, or clearing it, isn't
        // procrastination).
        const isPostponed =
          due_date !== null && !!existing?.due_date && due_date > existing.due_date;

        const { error } = await supabase
          .from("todos")
          .update({
            due_date,
            day_before_reminder_sent: false,
            due_day_reminder_sent: false,
            ...(isPostponed ? { due_date_postponed_at: new Date().toISOString() } : {}),
          })
          .eq("id", todoId)
          .eq("user_id", user.id);
        return { success: !error };
      },
    }),
    // This tool never deletes anything by itself. It only looks up the todo
    // and hands its id/text back so the chat UI can render a real
    // confirm/cancel button — actual deletion only happens if the user
    // clicks that button (see confirmDeleteTodo below), regardless of
    // whatever the model says next.
    requestDeleteTodo: tool({
      description:
        "ToDoの削除をユーザーに確認する。これは削除を実行しない。実際の削除は、ユーザーが画面のボタンを押した場合のみ行われる。",
      inputSchema: z.object({
        todoId: z.string().describe("listTodosで取得したToDoのid"),
      }),
      execute: async ({ todoId }) => {
        const { data } = await supabase
          .from("todos")
          .select("id, text")
          .eq("id", todoId)
          .eq("user_id", user.id)
          .maybeSingle();

        if (!data) {
          return { found: false as const };
        }
        return { found: true as const, todoId: data.id, todoText: data.text };
      },
    }),
    // Like requestDeleteTodo, this tool never writes to the database. It just
    // hands the model's proposed subtasks back so the chat UI can render a
    // confirm/cancel button — the actual bulk insert only happens if the user
    // clicks "登録する" (see confirmAddSubtasks below).
    suggestSubtasks: tool({
      description:
        "1つの大きなタスクを、複数の小さなサブタスクに分けて提案する。これは提案のみで、" +
        "実際には何も登録しない。実際の登録は、ユーザーが画面のボタンを押した場合のみ行われる。",
      inputSchema: z.object({
        subtasks: z
          .array(
            z.object({
              text: z.string().describe("サブタスクの内容"),
              due_date: z
                .string()
                .regex(/^\d{4}-\d{2}-\d{2}$/)
                .nullable()
                .describe("締切日(YYYY-MM-DD形式)。締切がなければnull"),
            })
          )
          .min(1)
          .max(10)
          .describe("提案するサブタスクの一覧(最大10件)"),
      }),
      execute: async ({ subtasks }) => {
        return { subtasks };
      },
    }),
    // Read-only aggregation for the weekly reflection feature. Nothing here
    // writes to the database, so (unlike deletions/subtask registration)
    // there's no need to gate this behind a confirmation button.
    getWeeklySummaryData: tool({
      description:
        "直近7日間の振り返り(週次サマリー)に必要なデータをまとめて取得する。" +
        "「今週の振り返り」「今週のまとめ」のように聞かれたら、これを呼び出すこと。",
      inputSchema: z.object({}),
      execute: async () => {
        const sevenDaysAgo = new Date(
          Date.now() - 7 * 24 * 60 * 60 * 1000
        ).toISOString();

        const [{ data: completed }, { data: postponed }, { data: overdue }] =
          await Promise.all([
            supabase
              .from("todos")
              .select("text, completed_at")
              .eq("user_id", user.id)
              .gte("completed_at", sevenDaysAgo),
            supabase
              .from("todos")
              .select("text, due_date, due_date_postponed_at")
              .eq("user_id", user.id)
              .gte("due_date_postponed_at", sevenDaysAgo),
            supabase
              .from("todos")
              .select("text, due_date")
              .eq("user_id", user.id)
              .neq("status", "completed")
              .lt("due_date", today),
          ]);

        return {
          completedInLast7Days: completed ?? [],
          postponedInLast7Days: postponed ?? [],
          currentlyOverdueAndIncomplete: overdue ?? [],
        };
      },
    }),
  };

  try {
    const result = await generateText({
      model: anthropic("claude-haiku-4-5-20251001"),
      system: `あなたはToDoアプリのアシスタントです。ユーザーとの会話から意図を読み取り、
用意されたツールを使ってToDoの追加・状態変更・締切日変更を行ってください。
今日の日付は${today}(日本時間)です。「来週」「明日」などの相対的な表現は、今日の日付を
基準に実際のカレンダー上の日付に変換してください。

重要なルール(必ず守ってください):
- ToDoの追加・状態変更・締切日変更・削除確認・サブタスクの提案を行うときは、必ず対応する
  ツール(addTodo / updateTodoStatus / updateDueDate / requestDeleteTodo / suggestSubtasks)を
  実際に呼び出してから返答してください。ツールを呼び出さずに「変更しました」「追加しました」
  のように結果を答えることは絶対にしないでください。
- 過去の会話で「変更した」「追加した」と言っていたとしても、それを鵜呑みにせず、
  操作の依頼を受けたら毎回必ずツールを呼び出してください。会話の記録よりも、
  ツールの実行結果(=実際のデータベースの状態)を優先してください。
- 現在のToDoの状態について何か答える場合(「今日は何をすべき?」など)や、特定のToDoを
  名前で操作する場合は、必ず先にlistTodosを呼び出して最新の一覧を取得してください。
  記憶や過去の会話内容だけで答えないでください。
- ToDoのidを推測したり、でっち上げたりしないでください。listTodosの結果に含まれる
  idだけを使ってください。該当しそうなToDoが複数見つかった場合は、操作を行わず、
  どれのことかユーザーに質問してください。

ToDoの削除については、あなたはrequestDeleteTodoしか呼び出せません。このツールは
実際には削除を行わず、画面に確認ボタンを表示するだけです。ユーザーが画面のボタンを
押した場合にのみ削除が実行されます。ユーザーに対しては「削除しました」のようには言わず、
「確認のボタンを表示しました。よろしければクリックしてください」のように伝えてください。

「〇〇というタスクを細かく分けて」のように、1つのタスクをサブタスクに分割してほしいと
頼まれた場合は、suggestSubtasksツールを呼び出して分割案(最大10件)を提案してください。
このツールも実際には何も登録せず、画面に確認ボタンを表示するだけです。ユーザーが画面の
ボタンを押した場合にのみ、提案したサブタスクが登録されます。分割の元になった
タスク自体は自動では削除されません(ユーザーが望めば別途削除を依頼できます)。
ユーザーに対しては「登録しました」のようには言わず、「サブタスク案を表示しました。
よろしければボタンを押してください」のように伝えてください。

「今週の振り返りを教えて」「今週のまとめは?」のように、直近の活動について聞かれた場合は、
必ずgetWeeklySummaryDataツールを呼び出してから、その結果(直近7日間で完了したタスク・
締切を先延ばしにしたタスク・現在期限切れで未完了のタスク)をもとに、傾向を自然な文章で
まとめて答えてください。完了したタスクはねぎらい、先延ばしが多い場合はやさしく指摘する、
といった前向きなトーンで答えてください。該当するデータがない場合は、その旨を素直に
伝えてください。このツールは何も変更しないため、確認ボタンは不要です。

返答はMarkdown記法(**太字**や見出し、箇条書きの記号など)を使わず、
プレーンなテキストの会話文で書いてください。`,
      messages: [
        ...history.map((m) => ({ role: m.role, content: m.content })),
        { role: "user" as const, content: trimmed },
      ],
      tools,
      // Claude Haiku sometimes narrates a plausible-sounding "I did it" reply
      // without actually calling any tool (observed empirically: toolCalls
      // came back empty even for unambiguous add/update requests, under the
      // default toolChoice: "auto"). Forcing a tool call on the first step
      // reliably fixes this, and it's harmless for plain conversation too —
      // worst case the model just calls listTodos before chatting normally.
      // Later steps are left as "auto" so it can still give a plain-text
      // final answer once it has done at least one real lookup/action.
      prepareStep: ({ stepNumber }) =>
        stepNumber === 0 ? { toolChoice: "required" as const } : {},
      stopWhen: stepCountIs(6),
    });

    // result.toolCalls/toolResults only reflect the LAST step. Tool calls
    // usually happen in earlier steps (with a final text-only step closing
    // out the reply), so pending deletions/suggestions must be collected
    // across every step, not just the last one.
    const pendingDeletions: PendingDeletion[] = [];
    const pendingSubtaskSuggestions: PendingSubtaskSuggestion[] = [];
    for (const step of result.steps) {
      for (const toolResult of step.toolResults) {
        if (toolResult.toolName === "requestDeleteTodo") {
          const output = toolResult.output as
            | { found: true; todoId: string; todoText: string }
            | { found: false };
          if (output.found) {
            pendingDeletions.push({ todoId: output.todoId, todoText: output.todoText });
          }
        }
        if (toolResult.toolName === "suggestSubtasks") {
          const output = toolResult.output as { subtasks: SuggestedSubtask[] };
          pendingSubtaskSuggestions.push({
            suggestionId: crypto.randomUUID(),
            subtasks: output.subtasks,
          });
        }
      }
    }

    const reply = result.text || "(操作を実行しました)";

    await supabase.from("chat_messages").insert([
      { user_id: user.id, role: "user", content: trimmed },
      { user_id: user.id, role: "assistant", content: reply },
    ]);

    revalidatePath("/");

    return { error: null, reply, pendingDeletions, pendingSubtaskSuggestions };
  } catch (e) {
    console.error("Chat error:", e);
    return {
      error: "AIとの通信に失敗しました。もう一度お試しください。",
      reply: null,
      pendingDeletions: [],
      pendingSubtaskSuggestions: [],
    };
  }
}

const PROACTIVE_SUGGESTION_COOLDOWN_HOURS = 24;
const NOT_STARTED_BACKLOG_THRESHOLD = 5;
const OVERDUE_THRESHOLD = 1;

// Called when the chat panel is first shown. Looks for things the user might
// want to know about (a growing not_started backlog, overdue todos) without
// being asked, but only speaks up once per cooldown window so it doesn't
// nag on every page load. Read-only aside from inserting its own chat
// message, so — like the weekly summary — this needs no confirm button.
export async function checkProactiveSuggestion(): Promise<ChatMessage | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const cooldownStart = new Date(
    Date.now() - PROACTIVE_SUGGESTION_COOLDOWN_HOURS * 60 * 60 * 1000
  ).toISOString();

  const { data: recentProactive } = await supabase
    .from("chat_messages")
    .select("id")
    .eq("user_id", user.id)
    .eq("is_proactive", true)
    .gte("created_at", cooldownStart)
    .limit(1)
    .maybeSingle();
  if (recentProactive) return null;

  const today = getTodayInJST();

  const [{ count: notStartedCount }, { count: overdueCount }] = await Promise.all([
    supabase
      .from("todos")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("status", "not_started"),
    supabase
      .from("todos")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .neq("status", "completed")
      .lt("due_date", today),
  ]);

  const hasBacklog = (notStartedCount ?? 0) >= NOT_STARTED_BACKLOG_THRESHOLD;
  const hasOverdue = (overdueCount ?? 0) >= OVERDUE_THRESHOLD;
  if (!hasBacklog && !hasOverdue) return null;

  const { text } = await generateText({
    model: anthropic("claude-haiku-4-5-20251001"),
    system: `あなたはToDoアプリのアシスタントです。今回はユーザーに話しかけられたのではなく、
あなたの方から自発的に、気づいたことを一言だけ伝える場面です。以下の状況をもとに、
1〜2文程度の短く前向きなトーンのコメントを、Markdown記法を使わないプレーンなテキストで
書いてください。押しつけがましくならないよう、やさしい言葉遣いにしてください。`,
    messages: [
      {
        role: "user",
        content: `未着手のタスクが${notStartedCount ?? 0}件あります。
期限切れなのに未完了のタスクが${overdueCount ?? 0}件あります。`,
      },
    ],
  });

  const content =
    text ||
    "未着手のタスクや期限切れのタスクが溜まっているようです。よければ確認してみてください。";

  const { data: inserted } = await supabase
    .from("chat_messages")
    .insert({ user_id: user.id, role: "assistant", content, is_proactive: true })
    .select("id, role, content, is_proactive")
    .single();

  return (inserted as ChatMessage) ?? null;
}

// The only path to an actual deletion: called directly from the confirm
// button's onClick in the UI, never by the AI.
export async function confirmDeleteTodo(todoId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "ログインが必要です" };

  await supabase.from("todos").delete().eq("id", todoId).eq("user_id", user.id);
  revalidatePath("/");
  return { error: null };
}

// The only path to actually registering suggested subtasks: called directly
// from the confirm button's onClick in the UI, never by the AI.
export async function confirmAddSubtasks(subtasks: SuggestedSubtask[]) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "ログインが必要です" };
  if (subtasks.length === 0) return { error: null };

  await supabase.from("todos").insert(
    subtasks.map((subtask) => ({
      text: subtask.text,
      due_date: subtask.due_date,
      status: "not_started" as const,
      user_id: user.id,
    }))
  );

  revalidatePath("/");
  return { error: null };
}
