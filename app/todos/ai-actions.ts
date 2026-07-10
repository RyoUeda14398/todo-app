"use server";

import { anthropic } from "@ai-sdk/anthropic";
import { generateText, Output } from "ai";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getTodayInJST } from "@/lib/date";

const extractionSchema = z.object({
  task: z.string().describe("日付や時刻の表現を除いた、やるべきことの内容"),
  due_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .describe("締切日(YYYY-MM-DD形式)。文章に締切の言及がなければnull"),
});

export type AddTodoFromTextState = {
  error: string | null;
  lastResult: { task: string; due_date: string | null } | null;
};

export async function addTodoFromText(
  _prevState: AddTodoFromTextState,
  formData: FormData
): Promise<AddTodoFromTextState> {
  const rawText = String(formData.get("raw_text") ?? "").trim();
  if (!rawText) {
    return { error: "文章を入力してください。", lastResult: null };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "ログインが必要です。", lastResult: null };
  }

  const today = getTodayInJST();

  try {
    const { output } = await generateText({
      model: anthropic("claude-haiku-4-5-20251001"),
      output: Output.object({ schema: extractionSchema }),
      temperature: 0,
      system: `あなたはToDoアプリの入力アシスタントです。ユーザーが書いた自由な日本語の文章から、
「タスクの内容」と「締切日」を読み取ってください。
今日の日付は ${today}(日本時間)です。「明日」「来週の金曜」のような相対的な表現は、今日の日付を基準に
実際のカレンダー上の日付に変換してください。
文章に締切についての言及がなければ due_date は null にしてください。
task には、日付や時刻の表現(「明日」「18時までに」など)を除いた、やるべきことの内容だけを
入れてください。`,
      prompt: rawText,
    });

    await supabase.from("todos").insert({
      text: output.task,
      due_date: output.due_date,
      user_id: user.id,
    });

    revalidatePath("/");

    return { error: null, lastResult: output };
  } catch {
    return {
      error: "AIによる読み取りに失敗しました。もう一度お試しください。",
      lastResult: null,
    };
  }
}
