"use server";

import { createClient } from "@/lib/supabase/server";

export type SignupState = {
  error: string | null;
  success: boolean;
};

export async function signup(
  _prevState: SignupState,
  formData: FormData
): Promise<SignupState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    return { error: error.message, success: false };
  }

  return { error: null, success: true };
}
