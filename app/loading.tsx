// Shown automatically by Next.js while the app's server components load
// (auth check + fetching todos / chat history on the top page). Kept as a
// self-contained dark "splash" so it looks intentional in both light and
// dark mode and blends into the app's neon / glassmorphism aesthetic.
export default function Loading() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-black via-indigo-950 to-black">
      {/* Blurred drifting light blobs, echoing the app's background. */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="animate-blob absolute -top-24 -left-16 h-80 w-80 rounded-full bg-indigo-600/25 blur-3xl" />
        <div className="animate-blob absolute bottom-0 right-0 h-72 w-72 rounded-full bg-violet-600/20 blur-3xl [animation-delay:-6s]" />
      </div>

      <div className="relative flex h-44 w-44 items-center justify-center">
        {/* Expanding halo pulses. */}
        <div className="animate-loading-halo absolute h-28 w-28 rounded-3xl bg-indigo-500/40 blur-2xl" />

        {/* Outer neon ring (indigo), rotating clockwise. */}
        <div
          className="animate-loading-spin absolute inset-0 rounded-full"
          style={{
            background:
              "conic-gradient(from 0deg, transparent 0%, transparent 55%, rgba(129,140,248,0.85) 82%, rgba(99,102,241,1) 100%)",
            WebkitMask:
              "radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 3px))",
            mask: "radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 3px))",
          }}
          aria-hidden
        />

        {/* Inner neon ring (violet), rotating counter-clockwise. */}
        <div
          className="animate-loading-spin-reverse absolute inset-4 rounded-full"
          style={{
            background:
              "conic-gradient(from 180deg, transparent 0%, transparent 60%, rgba(167,139,250,0.85) 85%, rgba(139,92,246,1) 100%)",
            WebkitMask:
              "radial-gradient(farthest-side, transparent calc(100% - 2px), #000 calc(100% - 2px))",
            mask: "radial-gradient(farthest-side, transparent calc(100% - 2px), #000 calc(100% - 2px))",
          }}
          aria-hidden
        />

        {/* The app icon, gently breathing. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/icon.png"
          alt="ToDo."
          width={96}
          height={96}
          className="animate-loading-pulse relative h-24 w-24 rounded-3xl"
        />
      </div>

      <p
        className="animate-loading-text mt-8 text-sm font-semibold tracking-widest text-indigo-200"
        role="status"
        aria-live="polite"
      >
        読み込み中...
      </p>
    </div>
  );
}
