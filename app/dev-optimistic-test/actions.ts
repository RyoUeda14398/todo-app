"use server";

import { revalidatePath } from "next/cache";

export async function slowAdd(_formData: FormData) {
  await new Promise((resolve) => setTimeout(resolve, 1500));
  revalidatePath("/dev-optimistic-test");
}

export async function slowDelete() {
  await new Promise((resolve) => setTimeout(resolve, 1500));
  revalidatePath("/dev-optimistic-test");
}
