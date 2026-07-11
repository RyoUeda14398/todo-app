import webpush from "web-push";

webpush.setVapidDetails(
  "https://todo-app-six-eta-83.vercel.app",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export default webpush;
