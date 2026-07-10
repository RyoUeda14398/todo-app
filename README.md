# ToDoアプリ

認証つきのシンプルなToDoアプリです。ログインしたユーザーごとに、自分のToDoだけを追加・完了・削除できます。

## 技術構成

- [Next.js 16](https://nextjs.org)(App Router, TypeScript)
- [React 19](https://react.dev)
- [Tailwind CSS 4](https://tailwindcss.com)
- 認証: [Supabase Auth](https://supabase.com/auth)(メールアドレス + パスワード)
- データベース: [Supabase PostgreSQL](https://supabase.com/database) + Row Level Security

## 機能

- メールアドレス + パスワードでのサインアップ / ログイン / ログアウト
- ログイン必須のToDo画面(未ログイン時は自動的に `/login` へリダイレクト)
- ToDoの追加・完了チェック・削除(すべてSupabase PostgreSQLに保存され、リロードしても消えない)
- Row Level Securityにより、ログイン中のユーザーは自分のToDoしか見えない・操作できない

## セットアップ

### 1. 依存パッケージのインストール

```bash
npm install
```

### 2. 環境変数の設定

`.env.local` をプロジェクトルートに作成し、Supabaseプロジェクトの値を設定してください。

```bash
NEXT_PUBLIC_SUPABASE_URL=your-project-url-here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

値はSupabaseダッシュボードの `Project Settings → API` から取得できます。

### 3. データベースのテーブル作成

Supabaseダッシュボードの SQL Editor で以下を実行し、`todos` テーブルとRLSポリシーを作成してください。

```sql
create table public.todos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  text text not null,
  completed boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.todos enable row level security;

create policy "Users can view their own todos"
  on public.todos for select
  using (auth.uid() = user_id);

create policy "Users can insert their own todos"
  on public.todos for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own todos"
  on public.todos for update
  using (auth.uid() = user_id);

create policy "Users can delete their own todos"
  on public.todos for delete
  using (auth.uid() = user_id);
```

### 4. 開発サーバーの起動

```bash
npm run dev
```

[http://localhost:3000](http://localhost:3000) をブラウザで開いてください。

## 注意

このプロジェクトのNext.jsバージョンでは `middleware.ts` が廃止され `proxy.ts` に名称変更されています。`proxy.ts` がリクエストごとにSupabaseの認証セッションをリフレッシュしています。
