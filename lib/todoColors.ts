export type TodoColor =
  | "red"
  | "orange"
  | "yellow"
  | "green"
  | "teal"
  | "blue"
  | "purple"
  | "pink";

type TodoColorInfo = {
  value: TodoColor;
  label: string;
  // Swatch/dot: a solid circle shown in the color picker and as a small
  // marker next to a task (list row, kanban card).
  dot: string;
  // Calendar chip: a soft background + matching text, mirroring the
  // indigo styling calendar chips use when no color is chosen.
  chip: string;
};

export const TODO_COLORS: TodoColorInfo[] = [
  { value: "red", label: "赤", dot: "bg-red-500 dark:bg-red-400", chip: "bg-red-100 text-red-700 dark:bg-red-500/25 dark:text-red-200" },
  { value: "orange", label: "オレンジ", dot: "bg-orange-500 dark:bg-orange-400", chip: "bg-orange-100 text-orange-700 dark:bg-orange-500/25 dark:text-orange-200" },
  { value: "yellow", label: "黄", dot: "bg-yellow-500 dark:bg-yellow-400", chip: "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/25 dark:text-yellow-200" },
  { value: "green", label: "緑", dot: "bg-green-500 dark:bg-green-400", chip: "bg-green-100 text-green-700 dark:bg-green-500/25 dark:text-green-200" },
  { value: "teal", label: "ティール", dot: "bg-teal-500 dark:bg-teal-400", chip: "bg-teal-100 text-teal-700 dark:bg-teal-500/25 dark:text-teal-200" },
  { value: "blue", label: "青", dot: "bg-blue-500 dark:bg-blue-400", chip: "bg-blue-100 text-blue-700 dark:bg-blue-500/25 dark:text-blue-200" },
  { value: "purple", label: "紫", dot: "bg-purple-500 dark:bg-purple-400", chip: "bg-purple-100 text-purple-700 dark:bg-purple-500/25 dark:text-purple-200" },
  { value: "pink", label: "ピンク", dot: "bg-pink-500 dark:bg-pink-400", chip: "bg-pink-100 text-pink-700 dark:bg-pink-500/25 dark:text-pink-200" },
];

export function isTodoColor(value: string): value is TodoColor {
  return TODO_COLORS.some((c) => c.value === value);
}

export function getTodoColorDotClass(color: string | null): string | null {
  if (!color) return null;
  return TODO_COLORS.find((c) => c.value === color)?.dot ?? null;
}

export function getTodoColorChipClass(color: string | null): string | null {
  if (!color) return null;
  return TODO_COLORS.find((c) => c.value === color)?.chip ?? null;
}
