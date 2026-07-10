@AGENTS.md

# プロジェクト概要

認証つきToDoアプリ。初心者ユーザー向けに、各ステップを説明しながら進めている。

## 技術構成

- Next.js 16 (App Router, TypeScript)
- React 19
- Tailwind CSS 4
- 認証: Supabase Auth(メール+パスワード)
- データベース: Supabase PostgreSQL(`todos`テーブルにToDoを保存。`id`, `user_id`, `text`,
  `completed`, `due_date`(締切日、任意), `position`(並び順、整数), `created_at`。
  Row Level Securityでユーザーごとに分離)
- ドラッグ&ドロップ: `@dnd-kit/core` / `@dnd-kit/sortable` / `@dnd-kit/utilities`
- 背景演出: `three` / `@react-three/fiber` / `@react-three/drei`(`Sparkles`でパーティクル背景)
- フォント: Zen Kaku Gothic New(`next/font/google`経由。日本語グリフを持つフォントに変更。
  旧Geistは日本語グリフを含んでおらず、実際には反映されていなかった)
- Node.js: v20.20.2 を nvm-windows で管理して使用している
  - システムのデフォルトはまだ古いNode(v17.9.1)なので、新しいターミナルでは
    `nvm use 20` が必要になる場合がある
- AI機能: Vercel AI SDK(`ai` v6系)+ `@ai-sdk/anthropic`。モデルはClaude Haiku 4.5
  (`claude-haiku-4-5-20251001`)。APIキーは`.env.local`の`ANTHROPIC_API_KEY`
  (`NEXT_PUBLIC_`なし、サーバー専用の秘密情報。従量課金であることに注意)

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
6. ToDoに締切日(任意)を設定できるように変更
   - `todos`テーブルに`due_date`(date型、NULL許可)列をSupabaseダッシュボードのSQL Editorで追加
     (既存の行はNULLになる。RLSポリシーは行単位のため追加設定不要)
   - `app/todos/actions.ts`の`addTodo`が締切日も保存
   - `app/components/TodoApp.tsx`の追加フォームに`<input type="date">`を追加(空欄可)
   - `app/components/TodoItem.tsx`で締切日を表示し、未完了かつ今日より前の日付なら赤字で強調
7. 自由な日本語の文章からAIがタスク内容・締切日を読み取って登録する機能を追加
   - `app/todos/ai-actions.ts` — `addTodoFromText` Server Action。`ai`パッケージの
     `generateText` + `Output.object()`(`generateObject`はこのバージョンで非推奨のため
     不使用)で、Claude Haiku 4.5にzodスキーマ(`task` / `due_date`)を指定して構造化データを
     取得。プロンプトに「今日の日付」を含めることで「明日」「来週金曜」等の相対表現を実際の
     日付に変換させている
   - `app/components/TodoApp.tsx`に「手入力」「AIにおまかせ」のタブを追加。AI側は自由文章の
     textarea + ボタンのみのシンプルな作り(このServer Actionはこの機能専用で、楽観的UI更新は
     未対応。完了後は`revalidatePath`で一覧が更新される)
   - 実装時、5つの例文(相対日付・絶対日付・締切なし混在)でAIの読み取り精度を単体検証済み
8. AIの締切日タイムゾーンバグ修正 + カレンダー機能 + デザイン刷新(ユーザー離席中に自律実行)
   - **バグ修正**: `lib/date.ts`に`getTodayInJST()`を新設。`new Date().toISOString().slice(0,10)`で
     「今日」を計算していた箇所(`ai-actions.ts`、`TodoItem.tsx`の期限切れ判定)を置き換え。
     詳細は下記トラブルシューティング記録を参照
   - AIのタスク抽出プロンプトに「日付・時刻表現を除いた内容だけをtaskに入れる」指示を明記
     (zodスキーマの`.describe()`だけでは安定しなかったため)し、`temperature: 0`を設定して
     抽出結果を安定させた
   - `app/components/Calendar.tsx`を新規作成。月間カレンダーを表示し、各日付のマスにその日が
     締切のToDoを表示(前月/次月ボタン、月見出しクリックで今月に戻る)
   - `app/page.tsx`を左右分割レイアウトに変更(左: ToDoリスト、右: カレンダー。`lg:flex-row`で
     大画面は横並び、それ未満は縦積みにして狭い画面でも崩れないようにした)
   - 全体のアクセントカラーをインディゴに統一(ボタン・タブ・チェックボックス・カレンダーの
     当日/締切表示)し、ヘッダーに固定のタイトルバーを追加。ログイン/サインアップ画面も
     同じ配色に統一
   - 検証: Playwrightで使い捨てメール(mailinator.com)を使ったテストアカウントを作成し、
     実際のブラウザ操作で手入力・AIおまかせ両方の追加、カレンダーへの反映、期限切れの赤字表示、
     月切り替え、モバイル幅(375px)でのレイアウト崩れがないことを確認済み
9. ドラッグ&ドロップ(並び替え・カレンダー移動)+ ダークモード + デザイン刷新2回目
   - `todos`テーブルに`position`(integer、並び順)列を追加(既存行は作成日時順で初期値を
     バックフィル)。`app/todos/actions.ts`に`reorderTodos` / `updateDueDate`を追加
   - ToDoの状態管理・楽観的更新を`TodoApp`から新設の`app/components/TodoBoard.tsx`に一本化。
     `DndContext`をここに置き、`TodoApp`(リスト)と`Calendar`の両方をラップすることで、
     「リスト内の並び替え」と「リストからカレンダーへ/カレンダー内でのドラッグ(締切日変更)」を
     1箇所のドラッグ判定ロジックで処理
   - `TodoItem`に`useSortable`で持ち手(⠿アイコン)を追加。`Calendar`の日付マスは
     `useDroppable`、日付マス内のToDoチップは`useDraggable`にして相互にドラッグ可能に
   - ダークモード切り替えボタン(`ThemeToggle`)を追加。`globals.css`に
     `@custom-variant dark (&:where(.dark, .dark *))`を追加してTailwindのダークモードを
     「OS設定連動」から「クラスで手動切り替え」に変更。`layout.tsx`に、ページ読み込み時に
     `localStorage`の設定を見て`<html>`へ`dark`クラスを同期的に付与するインラインscriptを追加
     (ちらつき防止)
   - フォントをZen Kaku Gothic Newに変更(`next/font/google`)。あわせて`body`の
     `font-family`が変数を参照しておらず実質Arialのままだった不具合も修正
   - カード類の影・角丸・タイポグラフィを強め、ボタンに押下時のスケールアニメーション、
     ToDo追加時のフェード+スライドインアニメーションを追加。配色はインディゴ(アクセント)+
     赤(期限切れ・エラーのみ)に統一し、AI登録成功メッセージの緑色も廃止
   - 実装中、`position`列のSQL実行確認を待たずに進めてしまい一時的にToDo一覧が空になる事故が
     発生(SQL実行後に解消)。以後、DB変更を伴う作業は実行確認を待ってから次に進めるよう徹底
10. 背景にThree.jsのパーティクル演出を追加
    - `app/components/ParticleBackground.tsx`(実体)+ `ParticleBackgroundLoader.tsx`
      (`next/dynamic` + `ssr: false`でクライアント専用読み込みするラッパー。Server Componentから
      直接`ssr: false`は使えない制約があるため、Client Componentのラッパーを挟んでいる)
    - `@react-three/drei`の`Sparkles`でふわふわ漂う粒子を表現。`fixed inset-0 -z-10` +
      `pointer-events-none`で操作の邪魔にならない最背面レイヤーとして配置
    - パフォーマンス対策: 画面幅が狭い(スマホ)場合は粒子数を削減、`dpr`(描画解像度)の上限を
      設定、タブが非表示のときは`frameloop="never"`で描画を止める
    - `prefers-reduced-motion`(Windowsの「視覚効果→アニメーション効果」等)が有効な場合は、
      粒子を非表示にするのではなく`frameloop="demand"`(1回だけ描画して静止)にして、
      「動きは止めるが飾りは見せる」形にしている(詳細は下記トラブルシューティング記録)
    - ライトモードでは`opacity-40`、ダークモードでは`opacity-100`にして、ダークモードで
      特に映えるが読みやすさは損なわないよう調整
    - 検証: Playwrightでドラッグ&ドロップが背景レイヤーに邪魔されず動作すること、
      コンソールエラーが出ないこと、ライト/ダーク/モバイル幅での見た目を確認済み
11. ダークモードの視認性・デザイン強化(2回目のフィードバック対応)
    - カレンダーの日付マスの枠線が`dark:border-zinc-900`で背景とほぼ同化していたのを
      `dark:border-white/10`(白の半透明)に変更。黒背景でも自然に見える濃さに調整
    - カレンダーの「今日」表示を、薄い枠線だけでなく塗りつぶしの丸バッジに変更し、
      一目でわかるようにした
    - カード類のダークモード配色を`dark:bg-zinc-950/90`(ほぼ不透明)から
      `dark:bg-zinc-950/70` + `dark:border-white/10` + インディゴ系の淡いグロー影
      (`shadow-[0_0_40px_-15px_rgba(99,102,241,0.4)]`)に変更し、背景の粒子が透けつつ
      浮遊感のある見た目に
    - ヘッダーの「ToDo.」ロゴをダークモード時のみインディゴ→バイオレットのグラデーション文字に
    - `<input type="date">`にダークモード時`color-scheme: dark`を指定し、ブラウザ標準の
      日付ピッカーもダークモードに追従するよう修正

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

### トラブルシューティング記録: AIの締切日が1日ずれる(タイムゾーン)問題

「明日の18時までに買い物する」とAIおまかせ入力すると、締切日が明日ではなく今日になってしまう、
という報告があり調査・修正した。

原因は、AIへのプロンプトに渡す「今日の日付」を`new Date().toISOString().slice(0, 10)`で
計算していたこと。この方法は常にUTC(世界標準時)の日付を返すが、Vercelのサーバーは
UTCで動作している。日本時間(JST = UTC+9時間)は世界標準時より9時間進んでいるため、
**日本時間の深夜0時〜朝9時の間は、UTCの日付がまだ「前日」のまま**になる。この時間帯に
「明日」と入力すると、AIは(1日遅れた)誤った「今日」を基準に計算するため、実際には
今日の日付を返してしまっていた。

修正は`lib/date.ts`の`getTodayInJST()`で、`Intl.DateTimeFormat`に`timeZone: "Asia/Tokyo"`を
明示的に指定して日付を計算する方式に変更(サーバーの実行環境のタイムゾーンに依存しない)。
同じ計算方法を使っていた`TodoItem.tsx`の期限切れ判定(赤字表示)も合わせて修正した。

修正後、日本時間の深夜0時20分(バグが起きやすい時間帯)を再現した状態で
「明日の18時までに買い物する」「今日中に洗濯する」「来週の金曜日までに資料作成」を
Anthropic APIに実際に投げて検証し、いずれも正しい日付になることを確認済み。

### トラブルシューティング記録: ダークモード導入直後のハイドレーションエラー

ダークモード切り替え機能を追加した直後、ブラウザのコンソールに
「A tree hydrated but some attributes of the server rendered HTML didn't match...」という
警告が出るようになった。原因は2つ重なっていた。

1. `ThemeToggle`が`useState` + DOM読み取りで「今ダークモードかどうか」を判定していたが、
   サーバー側は常に「ライトモード」でHTMLを生成する一方、クライアント側は先に実行される
   インラインscriptで`dark`クラスが付いた状態からReactが起動するため、ボタンの`aria-label`
   などがサーバー/クライアントで食い違っていた
   → `useSyncExternalStore`(サーバーでは分からない値を安全に扱うためのReact公式フック)に
     書き換えて解消
2. さらに根本的に、ページ読み込み時のインラインscriptが`<html>`要素の`class`属性を
   Reactのハイドレーション前に直接書き換えていたため、`<html>`要素自体の属性も
   サーバー/クライアントで食い違っていた
   → `app/layout.tsx`の`<html>`タグに`suppressHydrationWarning`を追加(この種の
     「意図的にscriptでテーマクラスを先に付与する」実装ではNext.js公式にも推奨されている対応)

### トラブルシューティング記録: `@dnd-kit`導入によるハイドレーションエラー(2回目)

上記の修正後も、`aria-describedby="DndDescribedBy-0"`(サーバー)と`"...-2"`(クライアント)が
食い違うハイドレーションエラーが発生した。

原因は`@dnd-kit/core`内部の仕様。アクセシビリティ用に自動生成しているID(`DndDescribedBy-N`)
が、`id`を明示的に渡さない場合、**モジュール読み込み時に作られる共有のカウンター変数**で
連番を振る実装になっている。このカウンターはサーバー側のNode.jsプロセスが使い回される限り
増え続ける一方、クライアント側は毎回0から数え直すため、サーバーがそれまでに何度か
レンダリングを行っていると(devモードのFast Refreshなど)値がズレてハイドレーションエラーに
なる。

修正は`app/components/TodoBoard.tsx`の`<DndContext>`に固定の`id="todo-board-dnd"`を
明示的に渡すこと。`id`を渡すと`@dnd-kit`はそのカウンターを使わず指定した値をそのまま
使うため、サーバー/クライアントで常に同じ結果になる。同じ`<DndContext>`を複数箇所で
使う場合は、それぞれ別のユニークな`id`を明示的に指定すること。

### トラブルシューティング記録: ダークモードでパーティクル背景が見えない

「ダークモードに切り替えても光の粒が見えない」という報告があり調査した。コンソールエラーは
なく、原因はWindowsの「視覚効果 → アニメーション効果」がオフ(またはブラウザ・OS側の
「視差効果を減らす」相当の設定が有効)になっていたこと。この設定が有効だと、ブラウザは
`prefers-reduced-motion: reduce`というCSS/JSから検知できる情報を返す。

`ParticleBackground.tsx`は元々、この設定が有効な場合に`return null`でコンポーネントごと
非表示にしていた。アクセシビリティ配慮としては間違っていないが、「動きを止める」のではなく
「存在ごと消す」実装だったため、粒子が一切見えなくなっていた。

修正は、非表示にする代わりに`<Canvas frameloop="demand">`(1回だけ描画して以降は再描画しない
=静止画になる)にすることで、アニメーションは止めつつ粒子自体は見えるようにした。
Playwrightで`page.emulateMedia({ reducedMotion: "reduce" })`を使い、この設定下でも
`<canvas>`要素が描画されることを確認済み。

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
