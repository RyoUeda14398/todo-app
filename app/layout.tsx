import type { Metadata, Viewport } from "next";
import { Zen_Kaku_Gothic_New } from "next/font/google";
import "./globals.css";

const zenKakuGothicNew = Zen_Kaku_Gothic_New({
  variable: "--font-zen-kaku",
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
});

export const metadata: Metadata = {
  title: "ToDoアプリ",
  description: "認証つきToDoアプリ（開発中）",
  appleWebApp: {
    title: "ToDo.",
    statusBarStyle: "black-translucent",
  },
  other: {
    // iOS Safari's own flag for "launch from the home screen without the
    // Safari address bar / toolbar" — the appleWebApp field above doesn't
    // emit this legacy (but still required on iOS) tag by itself.
    "apple-mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  themeColor: "#4f46e5",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ja"
      className={`${zenKakuGothicNew.variable} h-full antialiased`}
      suppressHydrationWarning
      // Plain inline style (not a Tailwind class) on purpose: this has to be
      // visible on the very first paint, before the stylesheet has loaded —
      // a class like `bg-black` doesn't take effect until Tailwind's CSS
      // arrives, which is exactly the gap that caused a flash of the
      // browser's default white background before the (always-dark)
      // loading.tsx splash could paint over it.
      style={{ backgroundColor: "#000000" }}
    >
      <body className="min-h-full flex flex-col">
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');var d=t?t==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;if(d)document.documentElement.classList.add('dark');}catch(e){}})();`,
          }}
        />
        {children}
      </body>
    </html>
  );
}
