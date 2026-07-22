import type { Metadata, Viewport } from "next";
import { Zen_Kaku_Gothic_New } from "next/font/google";
import "./globals.css";

const zenKakuGothicNew = Zen_Kaku_Gothic_New({
  variable: "--font-zen-kaku",
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
});

// iOS ignores the manifest's background_color for the home-screen launch
// screen — without an explicit apple-touch-startup-image per device size, it
// shows a blank white screen while the WKWebView process starts, which is
// what causes the white flash when reopening the installed PWA. One entry
// per common iPhone screen size (portrait), each pointing at
// app/apple-splash/route.tsx to render a plain black background with the app
// icon centered (matching the loading screen's own colors).
const appleSplashScreens = [
  { width: 1320, height: 2868, deviceWidth: 440, deviceHeight: 956, dpr: 3 }, // 16 Pro Max
  { width: 1290, height: 2796, deviceWidth: 430, deviceHeight: 932, dpr: 3 }, // 14 Pro Max / 15 Plus / 15 Pro Max / 16 Plus
  { width: 1206, height: 2622, deviceWidth: 402, deviceHeight: 874, dpr: 3 }, // 16 Pro
  { width: 1179, height: 2556, deviceWidth: 393, deviceHeight: 852, dpr: 3 }, // 14 Pro / 15 / 15 Pro / 16
  { width: 1284, height: 2778, deviceWidth: 428, deviceHeight: 926, dpr: 3 }, // 12 Pro Max / 13 Pro Max / 14 Plus
  { width: 1170, height: 2532, deviceWidth: 390, deviceHeight: 844, dpr: 3 }, // 12 / 12 Pro / 13 / 13 Pro / 14
  { width: 1125, height: 2436, deviceWidth: 375, deviceHeight: 812, dpr: 3 }, // X / XS / 11 Pro / 12 mini / 13 mini
  { width: 1242, height: 2688, deviceWidth: 414, deviceHeight: 896, dpr: 3 }, // XS Max / 11 Pro Max
  { width: 828, height: 1792, deviceWidth: 414, deviceHeight: 896, dpr: 2 }, // XR / 11
  { width: 750, height: 1334, deviceWidth: 375, deviceHeight: 667, dpr: 2 }, // SE (2nd/3rd gen) / 8 / 7
];

export const metadata: Metadata = {
  title: "ToDoアプリ",
  description: "認証つきToDoアプリ（開発中）",
  appleWebApp: {
    title: "ToDo.",
    statusBarStyle: "black-translucent",
    startupImage: appleSplashScreens.map(({ width, height, deviceWidth, deviceHeight, dpr }) => ({
      url: `/apple-splash?w=${width}&h=${height}`,
      media: `(device-width: ${deviceWidth}px) and (device-height: ${deviceHeight}px) and (-webkit-device-pixel-ratio: ${dpr}) and (orientation: portrait)`,
    })),
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
