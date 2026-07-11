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
};

export type PendingDeletion = {
  todoId: string;
  todoText: string;
};

export type SendChatMessageResult = {
  error: string | null;
  reply: string | null;
  pendingDeletions: PendingDeletion[];
};

export async function loadChatHistory(): Promise<ChatMessage[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("chat_messages")
    .select("id, role, content")
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
    return { error: "ログインが必要です。", reply: null, pendingDeletions: [] };
  }

  const trimmed = message.trim();
  if (!trimmed) {
    return { error: "メッセージを入力してください。", reply: null, pendingDeletions: [] };
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
          .order("position", { ascending: true });
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
        const { data: last } = await supabase
          .from("todos")
          .select("position")
          .eq("user_id", user.id)
          .order("position", { ascending: false })
          .limit(1)
          .maybeSingle();
        const position = (last?.position ?? -1) + 1;

        await supabase.from("todos").insert({
          text,
          due_date,
          position,
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
          .update({ status })
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
        const { error } = await supabase
          .from("todos")
          .update({
            due_date,
            day_before_reminder_sent: false,
            due_day_reminder_sent: false,
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
  };

  try {
    const result = await generateText({
      model: anthropic("claude-haiku-4-5-20251001"),
      system: `あなたはToDoアプリのアシスタントです。ユーザーとの会話から意図を読み取り、
用意されたツールを使ってToDoの追加・状態変更・締切日変更を行ってください。
今日の日付は${today}(日本時間)です。「来週」「明日」などの相対的な表現は、今日の日付を
基準に実際のカレンダー上の日付に変換してください。

重要なルール(必ず守ってください):
- ToDoの追加・状態変更・締切日変更・削除確認を行うときは、必ず対応するツール
  (addTodo / updateTodoStatus / updateDueDate / requestDeleteTodo)を実際に呼び出してから
  返答してください。ツールを呼び出さずに「変更しました」「追加しました」のように
  結果を答えることは絶対にしないでください。
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
    // out the reply), so pending deletions must be collected across every
    // step, not just the last one.
    const pendingDeletions: PendingDeletion[] = [];
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
      }
    }

    const reply = result.text || "(操作を実行しました)";

    await supabase.from("chat_messages").insert([
      { user_id: user.id, role: "user", content: trimmed },
      { user_id: user.id, role: "assistant", content: reply },
    ]);

    revalidatePath("/");

    return { error: null, reply, pendingDeletions };
  } catch (e) {
    console.error("Chat error:", e);
    return {
      error: "AIとの通信に失敗しました。もう一度お試しください。",
      reply: null,
      pendingDeletions: [],
    };
  }
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
