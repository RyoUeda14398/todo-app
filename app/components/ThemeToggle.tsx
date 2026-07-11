"use client";

import { useSyncExternalStore } from "react";

const THEME_CHANGE_EVENT = "theme-change";

function subscribe(callback: () => void) {
  window.addEventListener(THEME_CHANGE_EVENT, callback);
  return () => window.removeEventListener(THEME_CHANGE_EVENT, callback);
}

function getSnapshot() {
  return document.documentElement.classList.contains("dark");
}

function getServerSnapshot() {
  return false;
}

export default function ThemeToggle() {
  const isDark = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  function toggle() {
    const next = !isDark;
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
    window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? "ライトモードに切り替え" : "ダークモードに切り替え"}
      className="rounded-full border border-indigo-200/60 bg-white/50 p-2 text-lg text-zinc-500 backdrop-blur-md transition-all hover:border-indigo-300 hover:shadow-[0_0_16px_-2px_rgba(99,102,241,0.6)] active:scale-90 dark:border-indigo-400/20 dark:bg-white/5 dark:text-zinc-300 dark:hover:border-indigo-400/50 dark:hover:shadow-[0_0_16px_-2px_rgba(129,140,248,0.6)]"
      suppressHydrationWarning
    >
      <span suppressHydrationWarning>{isDark ? "☀️" : "🌙"}</span>
    </button>
  );
}
