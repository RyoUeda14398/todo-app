@AGENTS.md

# プロジェクト概要

認証つきToDoアプリ。初心者ユーザー向けに、各ステップを説明しながら進めている。

## 技術構成

- Next.js 16 (App Router, TypeScript)
- React 19
- Tailwind CSS 4
- 認証: Supabase Auth(メール+パスワード)
- データベース: Supabase PostgreSQL(未接続。今はSupabase AuthのユーザーテーブルのみでToDo本体はまだReactのstate)
- Node.js: v20.20.2 を nvm-windows で管理して使用している
  - システムのデフォルトはまだ古いNode(v17.9.1)なので、新しいターミナルでは
    `nvm use 20` が必要になる場合がある

## これまでにやったこと

1. `create-next-app` でプロジェクトを初期化
   (TypeScript / Tailwind / App Router / ESLint / import alias `@/*`)
2. ToDoのCRUD UIを実装(データはReactのstateのみ、DBなし)
   - `app/components/TodoApp.tsx` — 状態管理(追加・完了切り替え・削除)を持つクライアントコンポーネント
   - `app/components/TodoItem.tsx` — 1件分の行の見た目
   - `app/page.tsx` は認証チェック後に `TodoApp` を呼び出すサーバーコンポーネント
   - ページをリロードするとToDoデータは消える(意図的な仕様。DB移行は次回)
3. Supabase Authでログイン/サインアップを実装
   - `@supabase/supabase-js` / `@supabase/ssr` を導入
   - `.env.local` に `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` を設定(Git管理外)
   - `lib/supabase/client.ts` — ブラウザ用クライアント
   - `lib/supabase/server.ts` — サーバー用クライアント(Server Component/Actionで使用、Cookie経由でセッション管理)
   - `lib/supabase/proxy.ts` + ルート直下の `proxy.ts` — リクエストごとにセッションのCookieをリフレッシュ
   - `app/login/` — ログイン画面 + Server Action(`signInWithPassword`)
   - `app/signup/` — サインアップ画面 + Server Action(`signUp`、確認メール方式)
   - `app/logout/actions.ts` + `app/components/LogoutButton.tsx` — ログアウト
   - `app/page.tsx` で `supabase.auth.getUser()` により未ログイン時は `/login` にリダイレクト

## 今後の予定(未着手)

- ToDoデータのSupabase PostgreSQLへの移行(現状はReactのstateのみで永続化されない)

## 注意点

- `node_modules/next/dist/docs/` にこのバージョン固有のNext.js公式ドキュメントが
  同梱されている。破壊的変更が疑われる場合はまずここを確認すること。
- **重要な破壊的変更**: このNext.jsバージョンでは `middleware.ts` が廃止され `proxy.ts` に
  名称変更されている(`export function proxy()`、ファイル名も`proxy.ts`)。世の中の
  Supabase解説記事の多くは`middleware.ts`前提なので、参考にする際は読み替えが必要。
- 認証状態のチェックには `getSession()` ではなく `getUser()` / `getClaims()` を使うこと
  (`getSession()` はCookieの値をそのまま返すだけでAuthサーバーによる検証がないため、
  認可の判断に使ってはいけない、と `@supabase/ssr` のREADMEに明記されている)。
- `service_role`キー(secretキー)は使用しない。フロントエンドで使うのは`anon`キーのみ。
