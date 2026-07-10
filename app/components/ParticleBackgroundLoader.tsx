"use client";

import dynamic from "next/dynamic";

const ParticleBackground = dynamic(
  () => import("@/app/components/ParticleBackground"),
  { ssr: false }
);

export default function ParticleBackgroundLoader() {
  return <ParticleBackground />;
}
