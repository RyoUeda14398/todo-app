import { ImageResponse } from "next/og";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// iOS shows this in place of the default blank-white "launch screen" while a
// PWA's WKWebView spins up — before our own HTML/CSS/JS ever gets a chance to
// run, so it's the only way to avoid a white flash when reopening the app
// from the home screen. Referenced via `metadata.appleWebApp.startupImage`
// in app/layout.tsx, one entry per device size/media query.
const iconDataUrl = `data:image/png;base64,${readFileSync(
  join(process.cwd(), "app/apple-icon.png")
).toString("base64")}`;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const width = Number(searchParams.get("w")) || 1170;
  const height = Number(searchParams.get("h")) || 2532;
  const iconSize = Math.round(Math.min(width, height) * 0.22);

  return new ImageResponse(
    (
      <div
        style={{
          width,
          height,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#000000",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={iconDataUrl}
          alt=""
          width={iconSize}
          height={iconSize}
          style={{ borderRadius: iconSize * 0.22 }}
        />
      </div>
    ),
    { width, height }
  );
}
