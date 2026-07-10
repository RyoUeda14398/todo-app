"use client";

import { useOptimistic, useTransition } from "react";
import { slowAdd, slowDelete } from "./actions";

function Item({
  text,
  onDelete,
}: {
  text: string;
  onDelete: (text: string) => void;
}) {
  const [, startTransition] = useTransition();
  return (
    <li data-testid="item">
      {text}
      <button
        data-testid="delete-btn"
        onClick={() => {
          startTransition(async () => {
            onDelete(text);
            await slowDelete();
          });
        }}
      >
        delete
      </button>
    </li>
  );
}

export default function TestClient() {
  const [items, applyUpdate] = useOptimistic<
    string[],
    { type: "add"; text: string } | { type: "delete"; text: string }
  >(["seed-item"], (state, action) =>
    action.type === "add"
      ? [...state, action.text]
      : state.filter((t) => t !== action.text)
  );

  async function handleAdd(formData: FormData) {
    const text = String(formData.get("text") ?? "");
    applyUpdate({ type: "add", text });
    await slowAdd(formData);
  }

  function handleDelete(text: string) {
    applyUpdate({ type: "delete", text });
  }

  return (
    <div>
      <form action={handleAdd}>
        <input type="text" name="text" defaultValue="test-item" />
        <button type="submit">Add (1.5s server delay)</button>
      </form>
      <ul>
        {items.map((item, i) => (
          <Item key={item + i} text={item} onDelete={handleDelete} />
        ))}
      </ul>
    </div>
  );
}
