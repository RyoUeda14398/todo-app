@AGENTS.md

# プロジェクト概要

認証つきToDoアプリ。初心者ユーザー向けに、各ステップを説明しながら進めている。

## 技術構成

- Next.js 16 (App Router, TypeScript)
- React 19
- Tailwind CSS 4
- 認証: Supabase Auth(メール+パスワード)
- データベース: Supabase PostgreSQL(`todos`テーブルにToDoを保存。Row Level Securityでユーザーごとに分離)
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
4. ToDoデータをSupabase PostgreSQLに移行
   - `todos`テーブル(`id`, `user_id`, `text`, `completed`, `created_at`)をSupabaseダッシュボードのSQL Editorで作成
   - Row Level Security(RLS)を有効化し、`auth.uid() = user_id`の行だけ本人がselect/insert/update/deleteできるポリシーを設定
   - `app/todos/actions.ts` — `addTodo` / `toggleTodo` / `deleteTodo` のServer Action。RLSに加えてクエリ条件にも`user_id`を含め、二重に所有者チェック
   - `app/page.tsx`(サーバーコンポーネント)がログイン中ユーザーのToDoを取得し`TodoApp`へ渡す
   - `TodoApp` / `TodoItem` は自前でstateを持たず、渡された最新データをそのまま表示し、操作はServer Actionを直接呼ぶ形に変更(`revalidatePath("/")`で再描画)
5. ToDoの追加・完了切り替え・削除を楽観的UI更新(Optimistic UI)に変更
   - `app/components/TodoApp.tsx` に `useOptimistic` を導入し、ボタン操作の瞬間に画面へ反映
   - 裏側では従来どおりServer Actionを呼んでDBに保存し、`revalidatePath("/")`で本物のデータに置き換わる
   - `app/components/TodoItem.tsx` は親から渡された楽観的更新の関数を呼んでからServer Actionを呼ぶ順序に変更

## デプロイ

- GitHubリポジトリ: https://github.com/RyoUeda14398/todo-app
- Vercel(本番の固定URL、動作確認・共有には必ずこちらを使うこと):
  **https://todo-app-six-eta-83.vercel.app**
  - Vercelはpushのたびに `todo-xxxxxxxxx-noyaryo.vercel.app` のような「デプロイ固有URL」も
    発行するが、これはそのデプロイ内容に固定されたスナップショットで、以降のpushを反映しない。
    動作確認・共有には必ず上記の固定URL(Vercelダッシュボード → Settings → Domains で
    「Production」ラベルが付いている、ハッシュを含まないドメイン)を使うこと
- Deployment Protection(Vercel Authentication)はProduction環境について無効化済み
  (有効なままだと一般公開されず、全リクエストにSSO認証のオーバーヘッドがかかる)
- VercelのEnvironment Variablesに `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` を設定済み
- Supabaseダッシュボードの `Authentication → URL Configuration` で、Site URL / Redirect URLsを
  上記の固定URLに設定済み(確認メールのリンクをlocalhostや古いデプロイ固有URLではなく、
  常に最新を指す本番URLに向けるため)

### トラブルシューティング記録: 本番での楽観的UI更新が「遅い」問題

ToDoの追加・削除で導入した楽観的UI更新(`useOptimistic`)が、本番環境でだけ反応が遅く感じる、
という報告があり調査した。結論として `useOptimistic` の実装自体には問題がなく、原因は以下2点の
インフラ設定によるものだった。

1. **Deployment Protection(Vercel Authentication)が有効になっていた** — 全リクエストが
   VercelのSSO認証を経由する設定になっており、オーバーヘッドの一因になっていた
2. **確認に使っていたURLが「デプロイ固有URL」で、最新のpushを反映していなかった** —
   pushのたびに新しいURLが発行されることを知らず、古いデプロイを見続けていた

調査時は、認証不要の一時的な検証ページ(`useOptimistic`+わざと遅延させたServer Action)を
作り、ローカル(dev/本番ビルド)・Vercel本番のそれぞれでクリックから画面反映までの時間を
Playwrightで計測して切り分けた(いずれも50〜80ms程度で、React側の仕組みは正常と確認)。
検証ページは調査後に削除済み。

## 今後の予定(未着手)

- 現時点で特に予定している機能追加はなし

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
