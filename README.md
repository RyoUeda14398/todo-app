# ToDo.

認証つきのToDoアプリです。ログインしたユーザーごとに、自分のToDoだけを管理できます。
シンプルなCRUD(追加・完了・削除)から始まり、締切日、AIによる自然文入力、カレンダー表示、
ドラッグ&ドロップ、ダークモード、iPhoneのホーム画面へのインストール(PWA)、締切リマインダーの
プッシュ通知まで、少しずつ機能を追加しながら作られています。

このREADMEは、IT初心者の方でも「このアプリが何をしていて、どう動いているか」を
ある程度理解できることを目指して、通常より詳しめに書いています。

## 目次

- [このアプリでできること](#このアプリでできること)
- [技術構成](#技術構成)
- [プロジェクトの構成(フォルダ・ファイル解説)](#プロジェクトの構成フォルダファイル解説)
- [はじめての方向け: 用語解説](#はじめての方向け-用語解説)
- [セットアップ手順](#セットアップ手順)
- [開発サーバーの起動](#開発サーバーの起動)
- [データベース構成の詳細](#データベース構成の詳細)
- [デプロイについて](#デプロイについて)
- [既知の注意点・つまずきやすいポイント](#既知の注意点つまずきやすいポイント)

## このアプリでできること

- **認証**: メールアドレス+パスワードでのサインアップ / ログイン / ログアウト
  (未ログイン時は自動的に `/login` にリダイレクトされます)
- **ToDoの基本操作**: 追加・完了チェック・削除。すべてSupabase PostgreSQLに保存されるため、
  ページをリロードしてもデータは消えません
- **締切日の設定**(任意): 期限切れかつ未完了のToDoは赤字で強調表示されます
- **AIによる自然文入力**: 「明日の18時までに買い物する」のような自由な日本語文をAI
  (Claude Haiku 4.5)が解析し、タスク内容と締切日を自動的に読み取って登録します
  (相対的な日付表現もその日の日付を基準に正しく変換されます)
- **カレンダー表示**: 月間カレンダーで、締切日ごとにどのToDoがあるか一目で確認できます
- **ドラッグ&ドロップ**: ToDoリスト内での並び替えや、ToDoをカレンダーの別の日にドラッグして
  締切日を変更できます
- **カンバンボード**: 「未着手」「進行中」「完了」の3列にToDoを分類して表示します。
  カードを別の列にドラッグすると状態が変わります
- **ダークモード**: 手動で切り替え可能(設定は端末に保存され、次回訪問時も記憶されます)
- **背景の演出**: Three.jsによる、ふわふわ漂う光の粒子演出(ダークモードで特に映えるよう調整)
- **PWA対応**: iPhoneのSafariで「ホーム画面に追加」すると、アドレスバーのないアプリのような
  見た目で起動できます
- **締切リマインダー通知**: 毎朝、締切が今日または明日のToDoについて、プッシュ通知でお知らせします
  (ホーム画面に追加したPWAとして開いている場合、iPhoneでも通知を受け取れます)
- **AIとチャットで操作**: 「今日は何をすべき?」「買い物のタスクを来週に延期して」のように
  自然な文章で話しかけると、AIが状況を理解して答えたり、ToDoの追加・状態変更・締切日変更を
  実行したりします。削除だけは、AIの返答に関わらず画面の確認ボタンを押さない限り実行されません
- **AIによるタスクの自動分解**: 「掃除というタスクを細かく分けて」のように頼むと、AIがサブタスク案
  (最大10件)を提案します。削除と同様、画面の「登録する」ボタンを押さない限り登録されません
- **音声でチャットに入力**: チャットのマイクボタンを押して話しかけると、ブラウザの音声認識機能で
  自動的にテキストに変換され、入力欄に反映されます(対応ブラウザのみ)
- **AIによる週次サマリー**: 「今週の振り返りを教えて」と聞くと、直近7日間で完了したタスク・
  締切を先延ばしにしたタスク・現在期限切れのタスクの傾向をAIがまとめて答えます
- **AIからの気づきの提案**: 未着手のタスクが溜まっている、期限切れのタスクがある、といった
  状況にAIが気づくと、チャットに自発的に一言コメントを表示します(1日1回まで)

## 技術構成

| 分類 | 使用技術 | かんたんな説明 |
|---|---|---|
| フレームワーク | [Next.js 16](https://nextjs.org)(App Router) | Reactベースのフレームワーク。ページのルーティングや、サーバー側・クライアント側のコードを1つのプロジェクトにまとめて書ける |
| 言語 | TypeScript | JavaScriptに「型」の仕組みを足したもの。コードを書く時点でミスに気づきやすくなる |
| UIライブラリ | [React 19](https://react.dev) | 画面の部品(コンポーネント)を組み合わせてUIを作るためのライブラリ |
| スタイリング | [Tailwind CSS 4](https://tailwindcss.com) | `className="text-lg font-bold"`のように、あらかじめ用意された小さなCSSクラスを組み合わせて見た目を作る手法 |
| 認証 | [Supabase Auth](https://supabase.com/auth) | メールアドレス+パスワードでのログイン機能を提供するサービス |
| データベース | [Supabase PostgreSQL](https://supabase.com/database) | ToDoのデータなどを保存する本格的なリレーショナルデータベース。Row Level Security(後述)でユーザーごとにデータを分離 |
| ドラッグ&ドロップ | `@dnd-kit/core` / `@dnd-kit/sortable` / `@dnd-kit/utilities` | 要素をつまんで動かすUIを実現するライブラリ |
| 背景演出 | `three` / `@react-three/fiber` / `@react-three/drei` | 3Dグラフィックスを描画するThree.jsと、それをReactから使いやすくするラッパー |
| アイコン | `lucide-react` | シンプルな線画アイコンの詰め合わせライブラリ |
| フォント | Zen Kaku Gothic New(`next/font/google`経由) | 日本語グリフを含む見出し向けフォント |
| AI機能 | Vercel AI SDK(`ai`)+ `@ai-sdk/anthropic` | 自然文からタスクを読み取るために、Anthropic社のClaude Haiku 4.5モデルを呼び出す |
| 音声入力 | Web Speech API(ブラウザ標準機能) | 追加のライブラリやAPIキーなしで、ブラウザが直接音声をテキストに変換してくれる機能(対応ブラウザのみ) |
| プッシュ通知 | `web-push` | ブラウザの標準機能であるWeb Push APIを使って通知を送信するためのライブラリ |
| 入力値の検証 | `zod` | AIの応答など、外部からのデータが期待した形をしているかチェックする |

## プロジェクトの構成(フォルダ・ファイル解説)

Next.jsの「App Router」という方式では、`app/`フォルダの中の**フォルダ構造がそのままURLの構造**になります。
たとえば `app/login/page.tsx` は `/login` というページに対応します。

```
todo-app/
├── app/
│   ├── page.tsx                    … トップページ(ログイン中ならToDo画面、未ログインなら/loginへ)
│   ├── layout.tsx                  … 全ページ共通のレイアウト(フォント、ダークモード初期化スクリプトなど)
│   ├── globals.css                 … サイト全体のCSS(Tailwindの読み込み、ダークモード用の設定など)
│   ├── manifest.ts                 … PWAの設定(アプリ名・アイコン・起動時の見た目)
│   ├── icon.png / apple-icon.png   … アプリのアイコン画像(静的ファイル)
│   │
│   ├── login/                      … ログイン画面
│   │   ├── page.tsx
│   │   └── actions.ts              … 「Server Action」(後述)。ログイン処理の実体
│   ├── signup/                     … サインアップ画面(構成はloginと同様)
│   ├── logout/
│   │   └── actions.ts              … ログアウト処理
│   │
│   ├── todos/
│   │   ├── actions.ts              … ToDoの追加・完了切り替え・削除・並び替え・締切日変更
│   │   └── ai-actions.ts           … AIによる自然文からのToDo登録
│   │
│   ├── notifications/
│   │   └── actions.ts              … プッシュ通知の購読登録/解除、テスト通知の送信
│   │
│   ├── chat/
│   │   └── actions.ts              … AIとのチャット処理本体(Tool UseでToDoを追加・変更・削除確認・
│   │                                  サブタスク提案・週次サマリー・能動的な気づきの提案)
│   │
│   ├── api/
│   │   └── send-reminders/
│   │       └── route.ts            … 締切リマインダーを送信するAPI(Vercel Cronから毎朝呼ばれる)
│   │
│   └── components/                 … 画面の部品(コンポーネント)
│       ├── TodoBoard.tsx           … 「リスト・カレンダー」「ボード・チャット」のタブ切り替えと
│       │                              ドラッグ&ドロップを管理する親コンポーネント
│       ├── TodoApp.tsx             … ToDoリスト本体(手入力/AIタブ、一覧表示)
│       ├── TodoItem.tsx            … ToDo1件分の行
│       ├── Calendar.tsx            … 月間カレンダー
│       ├── KanbanBoard.tsx         … カンバンボード(未着手/進行中/完了の3列)
│       ├── AiChat.tsx              … AIとのチャットUI。削除・サブタスク登録は確認ボタン経由でのみ実行。
│       │                              マイクボタンでの音声入力、AIからの自発的な気づきの表示も担当
│       ├── ThemeToggle.tsx         … ダークモード切り替えボタン
│       ├── LogoutButton.tsx        … ログアウトボタン
│       ├── NotificationSettings.tsx / NotificationSettingsLoader.tsx
│       │                          … 通知オン/オフの設定UI(ブラウザ専用機能を使うため特別な読み込み方をしている)
│       └── ParticleBackground.tsx / ParticleBackgroundLoader.tsx
│                                   … 背景の光の粒子演出(同上の理由で特別な読み込み方をしている)
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts               … ブラウザ側で使うSupabaseクライアント
│   │   ├── server.ts               … サーバー側(Server Component/Action)で使うSupabaseクライアント
│   │   └── proxy.ts                … リクエストのたびにログインセッションを更新する処理
│   ├── date.ts                     … 日本時間(JST)を正しく扱うための日付ユーティリティ
│   └── web-push.ts                 … プッシュ通知送信ライブラリ(web-push)の初期設定
│
├── public/
│   └── sw.js                       … Service Worker(プッシュ通知を受け取って画面に表示する係)
│
├── proxy.ts                        … ルート直下。全リクエストで`lib/supabase/proxy.ts`の処理を実行
├── vercel.json                     … Vercel Cron Jobs(定期実行)の設定
├── CLAUDE.md                       … このプロジェクトの詳しい開発履歴・技術的な申し送り事項
│                                     (AIアシスタントとの作業ログを兼ねた、かなり詳細な技術メモ)
└── .env.local                      … 秘密情報(APIキーなど)。Gitには含まれません
```

## はじめての方向け: 用語解説

このアプリのコードでよく出てくる考え方を、かんたんに説明します。

### Server Component と Client Component

Next.jsのApp Routerでは、コンポーネント(画面の部品)に2種類あります。

- **Server Component**(既定・何も書かなければこちら): サーバー側だけで実行され、
  データベースへの問い合わせなど「秘密の処理」を安全に書ける。ボタンのクリックのような
  ブラウザ側の操作はできない
- **Client Component**(ファイルの先頭に`"use client"`と書く): 従来のReactのように
  ブラウザ側で動く。`useState`などのReactフックや、クリックイベントが使える

たとえば `app/page.tsx` はServer Component(データベースからToDoを取得する)で、
`app/components/TodoBoard.tsx` はClient Component(ドラッグ&ドロップの状態を管理する)です。

### Server Action

`"use server"`と書かれた関数のことです(例: `app/todos/actions.ts`)。
ブラウザ側から直接呼び出せますが、実際の処理は安全なサーバー側で実行されます。
「フォーム送信用のAPIをいちいち手作りしなくても、関数を1つ書くだけでよい」仕組みです。

### Row Level Security(RLS)

データベースの機能で、「このユーザーは自分の行(データ)しか見たり操作したりできない」という
ルールを、データベース側で強制する仕組みです。仮にアプリのコードにミスがあっても、
RLSが有効になっていれば他人のデータが漏れることはありません。このアプリではSupabaseの
`todos`テーブルと`push_subscriptions`テーブルの両方でRLSを有効にしています。

### Optimistic UI(楽観的UI更新)

「サーバーへの保存が完了するのを待たずに、先に画面だけ更新してしまう」テクニックです。
たとえばToDoにチェックを入れると、実際にデータベースへの保存が終わる前に、画面上では
即座にチェック済みの見た目になります。体感速度が上がるのが利点です。裏側では通常どおり
Server Actionが呼ばれてデータベースに保存され、本物のデータに置き換わります。

### PWA(Progressive Web App)

「ホーム画面に追加」などでアプリのように使えるWebサイトのことです。通常のWebサイトとの違いは:

- `manifest.ts`でアプリ名やアイコン、起動時の見た目(`display: "standalone"` = アドレスバーなし)を指定
- 専用のアイコン画像を用意する
- （通知機能を使う場合は）Service Workerという、画面を閉じていてもバックグラウンドで
  動く小さなスクリプトを登録する

### プッシュ通知の仕組み(Web Push)

「アプリを閉じていても通知が届く」ためには、大きく3者が関わります。

1. **このアプリのサーバー** — 「このユーザーに通知を送りたい」と指示を出す
2. **ブラウザ提供元のプッシュサービス**(iPhoneならApple) — 実際に端末まで通知を中継する
3. **Service Worker**(`public/sw.js`) — 通知を受け取って画面に表示する

iPhoneのSafariでは、**iOS 16.4以降**かつ**「ホーム画面に追加」したPWAとして開いている場合のみ**
通知の許可をリクエストできます。また、iOSには決まった時刻にローカルで通知を予約する仕組みが
ないため、このアプリでは**毎朝サーバー側(Vercel Cron Jobs)から、その時点で締切が近いToDoを
チェックしてプッシュを送る**方式を採用しています。

### Tool Use(AIによるツール呼び出し)

「AIとチャットで操作する」機能を支える技術です。AI自身がデータベースを直接操作するわけでは
ありません。代わりに、こちらのコードが「使える道具(ツール)の一覧」(例:
「ToDoを追加する」「締切日を変える」)をAIに渡し、AIは会話の内容から「この道具をこの引数で
使いたい」というリクエストを返すだけです。実際の処理(データベースへの読み書き)は、
このアプリのサーバー側コードが安全に実行します。

このアプリでは、AIが実際に削除できないように**特に念入りな設計**にしています。AIが呼び出せる
削除系のツールは、ToDoを検索して確認情報を返すだけで、何も削除しません。実際の削除は、
チャット画面に表示される「削除する」ボタンをユーザーがクリックした場合にのみ、
AIを介さず直接実行されます。タスクの自動分解(サブタスクの提案)も同じ考え方で、
AIが呼べるのは提案するだけのツールで、実際の一括登録は「登録する」ボタン経由でのみ実行されます。

## セットアップ手順

### 1. Node.jsのバージョン

このプロジェクトはNode.js v20系で動作確認しています。`nvm`などでバージョンを切り替えている場合は、
作業前に以下を実行してください。

```bash
nvm use 20
```

### 2. 依存パッケージのインストール

```bash
npm install
```

### 3. Supabaseプロジェクトの準備

[Supabase](https://supabase.com)で新しいプロジェクトを作成し、`Project Settings → API`から
プロジェクトURLと`anon`キー(公開用キー。`service_role`キーは使いません)を控えておきます。

### 4. 環境変数の設定

プロジェクトルートに`.env.local`を作成し、以下を設定してください(このファイルはGit管理外です)。

```bash
# Supabase(認証・データベース)
NEXT_PUBLIC_SUPABASE_URL=your-project-url-here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# AI機能(自然文からのToDo登録。Anthropic Consoleで取得)
ANTHROPIC_API_KEY=your-anthropic-api-key-here

# プッシュ通知用のVAPID鍵(下記コマンドでその場で生成できます。外部サービスへの登録は不要)
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your-vapid-public-key-here
VAPID_PRIVATE_KEY=your-vapid-private-key-here

# 締切リマインダーAPIを保護する秘密の文字列(下記コマンドで生成)
CRON_SECRET=your-random-secret-here
```

VAPID鍵は以下のコマンドでその場で生成できます(Supabase/Anthropicのキーと違い、外部サービスへの
登録は不要です)。

```bash
npx web-push generate-vapid-keys
```

`CRON_SECRET`は、以下のようなコマンドでランダムな文字列を生成して設定してください。

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 5. データベースのセットアップ

Supabaseダッシュボードの「SQL Editor」で、以下を順番に実行してください。

<details>
<summary>クリックして全SQLを表示</summary>

```sql
-- ============================================================
-- 1. todosテーブル
-- ============================================================
create table public.todos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  text text not null,
  status text not null default 'not_started'
    check (status in ('not_started', 'in_progress', 'completed')),
  completed boolean generated always as (status = 'completed') stored,
  due_date date,
  position integer not null default 0,
  day_before_reminder_sent boolean not null default false,
  due_day_reminder_sent boolean not null default false,
  completed_at timestamptz,
  due_date_postponed_at timestamptz,
  -- 論理削除(ソフトデリート)用。NULL = 通常/未削除。日時が入っていると
  -- リスト・ボード・チャットからは非表示になるが、締切日があればカレンダーには
  -- 「削除済み」の過去の記録として残り続ける。
  deleted_at timestamptz,
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

-- ============================================================
-- 2. push_subscriptions テーブル(プッシュ通知の宛先情報)
-- ============================================================
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth_key text not null,
  created_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;

create policy "Users manage their own push subscriptions"
  on public.push_subscriptions
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- 3. Supabase Vault(秘密情報の暗号化保管庫)を有効化し、
--    リマインダーAPIを保護するための合言葉(CRON_SECRETと同じ値)を保存
--    'PASTE_YOUR_CRON_SECRET_HERE' を、.env.local の CRON_SECRET の値に
--    置き換えてから実行してください(改行や空白を含めないよう注意)
-- ============================================================
create extension if not exists supabase_vault cascade;

select vault.create_secret(
  'PASTE_YOUR_CRON_SECRET_HERE',
  'cron_secret',
  'Shared secret used to authorize the daily reminder cron job RPC calls'
);

-- ============================================================
-- 4. 「今日/明日締切のToDo」を全ユーザー分横断チェックする関数
-- ============================================================
create or replace function get_due_reminders(p_secret text)
returns table (
  todo_id uuid,
  todo_text text,
  reminder_type text,
  subscription_id uuid,
  endpoint text,
  p256dh text,
  auth_key text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_expected_secret text;
begin
  select decrypted_secret into v_expected_secret
  from vault.decrypted_secrets
  where name = 'cron_secret';

  if p_secret is distinct from v_expected_secret then
    raise exception 'unauthorized';
  end if;

  return query
  select
    t.id as todo_id,
    t.text as todo_text,
    case
      when t.due_date = ((now() at time zone 'Asia/Tokyo')::date) then 'due_today'
      else 'day_before'
    end as reminder_type,
    ps.id as subscription_id,
    ps.endpoint,
    ps.p256dh,
    ps.auth_key
  from todos t
  join push_subscriptions ps on ps.user_id = t.user_id
  where t.completed = false
    and t.deleted_at is null
    and (
      (
        t.due_date = ((now() at time zone 'Asia/Tokyo')::date)
        and t.due_day_reminder_sent = false
      )
      or
      (
        t.due_date = ((now() at time zone 'Asia/Tokyo')::date + 1)
        and t.day_before_reminder_sent = false
      )
    );
end;
$$;

grant execute on function get_due_reminders(text) to anon;

-- ============================================================
-- 5. 送信済みフラグを立てる関数
-- ============================================================
create or replace function mark_reminder_sent(p_secret text, p_todo_id uuid, p_type text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_expected_secret text;
begin
  select decrypted_secret into v_expected_secret
  from vault.decrypted_secrets
  where name = 'cron_secret';

  if p_secret is distinct from v_expected_secret then
    raise exception 'unauthorized';
  end if;

  if p_type = 'due_today' then
    update todos set due_day_reminder_sent = true where id = p_todo_id;
  elsif p_type = 'day_before' then
    update todos set day_before_reminder_sent = true where id = p_todo_id;
  end if;
end;
$$;

grant execute on function mark_reminder_sent(text, uuid, text) to anon;

-- ============================================================
-- 6. 期限切れになった購読情報(通知が届かなくなった端末)を削除する関数
-- ============================================================
create or replace function delete_push_subscription(p_secret text, p_subscription_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_expected_secret text;
begin
  select decrypted_secret into v_expected_secret
  from vault.decrypted_secrets
  where name = 'cron_secret';

  if p_secret is distinct from v_expected_secret then
    raise exception 'unauthorized';
  end if;

  delete from push_subscriptions where id = p_subscription_id;
end;
$$;

grant execute on function delete_push_subscription(text, uuid) to anon;

-- ============================================================
-- 7. AIとのチャット履歴を保存するテーブル
-- ============================================================
create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  is_proactive boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.chat_messages enable row level security;

create policy "Users manage their own chat messages"
  on public.chat_messages
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

</details>

なぜこのような一見複雑な作り(`security definer`関数 + Vault)になっているかは、
[データベース構成の詳細](#データベース構成の詳細)で説明しています。

## 開発サーバーの起動

```bash
npm run dev
```

[http://localhost:3000](http://localhost:3000) をブラウザで開いてください。

その他のコマンド:

```bash
npm run build   # 本番用にビルド
npm run start   # ビルドしたものを起動
npm run lint    # ESLintでコードをチェック
```

## データベース構成の詳細

### なぜ`security definer`関数とVaultが必要なのか

締切リマインダーの送信処理(毎朝の定期実行)は、**特定のログインユーザーの操作ではなく、
全ユーザーのデータを横断してチェック**する必要があります。しかし通常のSupabaseアクセス
(`anon`キー)は、RLSによって「本人の行しか見えない」よう制限されています。

これを解決する方法として、このプロジェクトでは以下の設計を採用しました。

- `service_role`キー(RLSを無視できる強い権限のキー)は使わない方針とした
  (サーバー専用とはいえ、アプリの一部にでも強い権限のキーを持ち込むと、将来的な事故の
  リスクが上がるため)
- 代わりに、「今日/明日締切のToDoを取得する」「送信済みフラグを立てる」といった
  **必要最小限の処理だけ**を`security definer`関数(関数の所有者=管理者権限で実行される
  Postgresの関数)としてデータベース側に定義
- この関数は、引数で渡された秘密の文字列(`CRON_SECRET`と同じ値)が、Supabase Vault
  (秘密情報を暗号化して保管する仕組み)に保存された値と一致した場合のみ動作する

これにより、アプリのコードは常に`anon`キーだけを使いながら、必要な処理だけを安全に
実行できるようになっています。

### テーブル一覧

**`todos`** — ToDo本体

| 列名 | 型 | 説明 |
|---|---|---|
| `id` | uuid | 主キー |
| `user_id` | uuid | 所有者(`auth.users`への外部キー) |
| `text` | text | ToDoの内容 |
| `status` | text | `not_started` / `in_progress` / `completed` の3値(カンバンボードの列に対応) |
| `completed` | boolean | `status = 'completed'`のときだけtrueになる自動計算列(生成列)。直接書き込みはできない |
| `due_date` | date | 締切日(任意) |
| `due_time` | time | 締切時刻(任意)。締切日が設定されている場合のみ保持 |
| `color` | text | タスクの色分け(任意)。`red`/`orange`/`yellow`/`green`/`teal`/`blue`/`purple`/`pink` |
| `position` | integer | 並び順(現在は締切順の自動並べ替えに移行したため未使用) |
| `day_before_reminder_sent` | boolean | 「明日締切」の通知を送信済みか |
| `due_day_reminder_sent` | boolean | 「今日締切」の通知を送信済みか |
| `completed_at` | timestamptz | 完了した日時(週次サマリーの「今週完了したタスク」判定に使用) |
| `due_date_postponed_at` | timestamptz | 締切日を後ろ倒しに変更した日時(週次サマリーの「先延ばし」判定に使用) |
| `deleted_at` | timestamptz | 論理削除(ソフトデリート)の日時。NULL = 未削除。日時が入っているとリスト/ボード/チャットからは非表示になり、締切日があればカレンダーに「削除済み」記録として残る |
| `created_at` | timestamptz | 作成日時 |

**`push_subscriptions`** — プッシュ通知の宛先情報(端末ごとに1行)

| 列名 | 型 | 説明 |
|---|---|---|
| `id` | uuid | 主キー |
| `user_id` | uuid | 所有者 |
| `endpoint` | text | プッシュサービスの宛先URL |
| `p256dh` / `auth_key` | text | 暗号化に使う鍵情報(ブラウザが自動生成) |
| `created_at` | timestamptz | 登録日時 |

**`chat_messages`** — AIとの会話履歴

| 列名 | 型 | 説明 |
|---|---|---|
| `id` | uuid | 主キー |
| `user_id` | uuid | 所有者 |
| `role` | text | `user`(ユーザーの発言)または`assistant`(AIの返答) |
| `content` | text | 発言内容 |
| `is_proactive` | boolean | ユーザーに聞かれたのではなく、AIが自発的に発言したメッセージかどうか |
| `created_at` | timestamptz | 発言日時 |

## デプロイについて

- ホスティング: [Vercel](https://vercel.com)。GitHubリポジトリと連携しており、
  `master`ブランチにpushすると自動的に本番環境へデプロイされます
- 締切リマインダーの定期実行には[Vercel Cron Jobs](https://vercel.com/docs/cron-jobs)を
  使用しています(`vercel.json`で設定。無料のHobbyプランでは「1日1回まで、時刻の精度は
  ±59分程度」という制限がありますが、今回の「毎朝チェック」という用途には十分です)
- Vercel側の「Environment Variables」に、`.env.local`と同じ環境変数
  (`NEXT_PUBLIC_SUPABASE_URL`、`NEXT_PUBLIC_SUPABASE_ANON_KEY`、`ANTHROPIC_API_KEY`、
  `NEXT_PUBLIC_VAPID_PUBLIC_KEY`、`VAPID_PRIVATE_KEY`、`CRON_SECRET`)をすべて設定する必要があります
- Vercelは、pushのたびに「デプロイ固有URL」(`https://todo-xxxxxxxxx-〇〇.vercel.app`のような形)も
  発行しますが、これはそのデプロイ内容に固定されたスナップショットで、以降のpushを反映しません。
  動作確認・共有には、Vercelダッシュボードの`Settings → Domains`で「Production」ラベルが
  付いている、ハッシュを含まない固定のドメインを使ってください
- SupabaseダッシュボードのAuthentication設定(`URL Configuration`)で、Site URL /
  Redirect URLsを本番の固定URLに向けておく必要があります(確認メールのリンクなどに使われるため)

## 既知の注意点・つまずきやすいポイント

- **`middleware.ts`ではなく`proxy.ts`**: このプロジェクトのNext.jsバージョンでは、
  従来`middleware.ts`という名前だったファイルが`proxy.ts`に名称変更されています
  (`export function proxy()`という関数名も変わっています)。世の中のSupabase解説記事の
  多くは`middleware.ts`前提で書かれているため、参考にする際は読み替えが必要です
- **認証チェックは`getUser()`を使う**: `getSession()`はCookieの値をそのまま返すだけで、
  Authサーバーによる検証を経ないため、認可の判断に使ってはいけません(`@supabase/ssr`の
  READMEに明記されています)。このプロジェクトでは常に`getUser()`を使っています
- **`service_role`キーは使わない**: フロントエンド・サーバー側どちらのコードでも、
  Supabaseへのアクセスには`anon`キーのみを使う方針です。全ユーザー横断の処理が必要な場合は、
  上述の`security definer`関数 + Vaultの組み合わせで対応しています
- **タイムゾーンの扱い**: Vercelのサーバーは世界標準時(UTC)で動作していますが、
  このアプリは日本時間(JST)を基準に「今日」「明日」を判定する必要がある処理が複数あります
  (AIの締切日解析、期限切れ表示、リマインダー送信)。単純に`new Date()`を使うと、
  日本時間の深夜0時〜朝9時の間だけ日付がずれるバグの原因になるため、`lib/date.ts`の
  `getTodayInJST()`のように、必ずタイムゾーンを明示して計算しています
- **`node_modules/next/dist/docs/`**: このバージョン固有のNext.js公式ドキュメントが
  同梱されています。破壊的変更が疑われる場合は、まずここを確認するのが確実です

より詳しい開発の経緯・トラブルシューティングの記録は`CLAUDE.md`にまとめてあります。
