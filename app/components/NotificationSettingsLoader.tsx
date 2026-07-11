"use client";

import dynamic from "next/dynamic";

const NotificationSettings = dynamic(
  () => import("@/app/components/NotificationSettings"),
  { ssr: false }
);

export default function NotificationSettingsLoader() {
  return <NotificationSettings />;
}
