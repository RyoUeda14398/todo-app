import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ToDo. - 認証つきToDoアプリ",
    short_name: "ToDo.",
    description: "AI入力・カレンダー・ドラッグ&ドロップ対応のToDoアプリ",
    start_url: "/",
    display: "standalone",
    background_color: "#000000",
    theme_color: "#4f46e5",
    icons: [
      {
        src: "/icon",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
