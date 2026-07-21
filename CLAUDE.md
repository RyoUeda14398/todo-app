@AGENTS.md

# プロジェクト概要

認証つきToDoアプリ。初心者ユーザー向けに、各ステップを説明しながら進めている。

> **beginner向けの説明はREADME.mdへ**: 機能一覧・用語解説・セットアップ手順・データベース
> スキーマなど、人間(特に初心者)が読んで理解するための説明は`README.md`に整理してある。
> このCLAUDE.mdは、AIアシスタントが作業を引き継ぐための技術的な申し送り事項と、
> これまでの開発履歴・トラブルシューティング記録を時系列で残すためのファイル。

## 技術構成

- Next.js 16 (App Router, TypeScript)
- React 19
- Tailwind CSS 4
- 認証: Supabase Auth(メール+パスワード)
- データベース: Supabase PostgreSQL。RLSでユーザーごとにデータを分離(詳細なテーブル定義は
  README.mdの「データベース構成の詳細」を参照)
  - `todos`テーブル: `id`, `user_id`, `text`, `completed`, `due_date`(締切日、任意),
    `position`(並び順、整数), `day_before_reminder_sent` / `due_day_reminder_sent`
    (リマインダー送信済みフラグ), `created_at`
  - `push_subscriptions`テーブル: プッシュ通知の宛先情報(端末ごと)
  - `get_due_reminders` / `mark_reminder_sent` / `delete_push_subscription`:
    全ユーザー横断でリマインダー対象を調べる`security definer`関数(Supabase Vaultで
    保護。詳細は下記18番およびREADME.mdを参照)
- ドラッグ&ドロップ: `@dnd-kit/core` / `@dnd-kit/sortable` / `@dnd-kit/utilities`
- 背景演出: `three` / `@react-three/fiber` / `@react-three/drei`(`Sparkles`でパーティクル背景)
- アイコン: `lucide-react`(ヘッダーロゴの`ListTodo`アイコンで使用)
- フォント: Zen Kaku Gothic New(`next/font/google`経由。日本語グリフを持つフォントに変更。
  旧Geistは日本語グリフを含んでおらず、実際には反映されていなかった)
- Node.js: v20.20.2 を nvm-windows で管理して使用している
  - システムのデフォルトはまだ古いNode(v17.9.1)なので、新しいターミナルでは
    `nvm use 20` が必要になる場合がある
- AI機能: Vercel AI SDK(`ai` v6系)+ `@ai-sdk/anthropic`。モデルはClaude Haiku 4.5
  (`claude-haiku-4-5-20251001`)。APIキーは`.env.local`の`ANTHROPIC_API_KEY`
  (`NEXT_PUBLIC_`なし、サーバー専用の秘密情報。従量課金であることに注意)
- 締切リマインダー通知: `web-push`(Web Push APIでの送信)+ Vercel Cron Jobs(毎日の
  定期実行)。VAPID鍵(`NEXT_PUBLIC_VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY`)と
  `CRON_SECRET`は`.env.local`とVercelの環境変数の両方に設定が必要。詳細は下記18番

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

12. デザイン刷新第3弾(枠線コントラスト・質感・パーティクル可視性)
    - ダークモードの枠線を`dark:border-white/10`→`dark:border-white/15`前後に統一し、
      カード類には内側ハイライト(`inset shadow`)を追加して縁を強調
    - カード背景を単色(`bg-white/90` / `dark:bg-zinc-950/70`)から、light/darkそれぞれ
      indigo/violetをうっすら混ぜた斜めグラデーションに変更。ページ全体にもぼかした
      「光の玉」を数個配置し、奥行きを追加
    - 主要ボタン(追加・登録・送信)をindigo単色からindigo→violetのグラデーションに変更し、
      ホバー時に浮き上がるアニメーションと影を強化
    - ライトモードでもパーティクル演出が見えるよう、`ParticleBackground.tsx`に
      `ThemeToggle`と同じ`useSyncExternalStore`ベースのテーマ検知を追加し、ライトモード時は
      粒子の色をより濃い・彩度の高いindigoに切り替え
    - 実装中に2つの実質的なバグを発見・修正(詳細は下記トラブルシューティング記録参照):
      「ダークモードでToDo行が白背景のまま残る」問題と
      「ライトモードでパーティクルが完全に描画されない(Canvasのバグ)」問題

13. デザイン刷新第4弾(ライトモードの華やかさ・ダークモードのカレンダー視認性)
    - ライトモードのカードを`from-white via-white to-indigo-50/60`(実質ほぼ白)から
      `from-white via-indigo-50/50 to-violet-50/70`に変更し、はっきり分かるindigo/violet
      グラデーションに。影も`shadow-zinc-200/60`(グレー)から
      `shadow-[0_25px_60px_-20px_rgba(99,102,241,0.35)]`(indigoのグロー)に変更
    - ページ背景の「光の玉」(`page.tsx`)のライトモード側の不透明度を`/20〜/25`から
      `/30〜/40`に引き上げ、はっきり視認できるように
    - ヘッダーの「ToDo.」ロゴのグラデーション文字を、ダークモード限定からライトモードにも適用。
      ヘッダー背景・タブの選択状態にも淡いindigoの色味を追加
    - カレンダーの日付マス(`Calendar.tsx`)に、枠線だけでなく背景色
      (`bg-zinc-50/60` / `dark:bg-white/[0.03]`)を追加し、特にダークモードでマスの
      境界がはっきり分かるように改善。枠線の不透明度も`white/15`→`white/20`に強化
    - ヘッダーの背景をグラデーション(`bg-gradient-to-r`)に変更する際、`dark:bg-black/50`
      (background-color)と衝突しないよう`dark:bg-none`を明示的に追加
      (前回のToDo行と同種の「background-colorとbackground-imageの重ね掛け」バグを
      未然に回避)

14. デザイン刷新第5弾(大胆なメリハリ・本格的なグラスモーフィズム)
    - 見出し(「ToDoリスト」「2026年7月」)を`text-2xl font-extrabold`から
      `text-4xl〜text-5xl font-black`に大幅拡大。カレンダーの日付数字も
      `text-xs`→`text-sm/base font-bold`、丸のサイズも一回り大きく
    - カード類の枠線を`border`(1px)→`border-2`(2px)に太くし、色も白/黒ではなく
      indigo系(ライト`border-indigo-200/70`、ダーク`dark:border-indigo-400/40`)に変更。
      `backdrop-blur-md`→`backdrop-blur-2xl`でガラスのぼかしも強化
    - 「手入力」「AIにおまかせ」のタブを、下線方式からセグメントコントロール風
      (選択中のタブがindigo→violetグラデーションの塗りつぶし背景+白文字になる)に変更
    - 「追加」ボタンを`px-4 py-2`→`px-6 py-3.5`、`text-base font-semibold`に拡大し、
      影も`shadow-md`→`shadow-lg`に強化
    - カレンダーの日付マスに、ToDoの有無で明確な差をつけた:
      ToDoがあるマスには左端にindigoの縦ライン(`border-l-4 border-l-indigo-500`)+
      薄い背景色、さらに全マスにホバー時の浮き上がり(`hover:-translate-y-0.5`)と
      背景色の変化を追加
    - `TodoBoard.tsx`のレイアウトを、左右2カードが均等グリッドに見えないよう、
      カレンダー側に`lg:mt-10`で縦方向のオフセットを追加。カード間の余白も
      `gap-8`→`gap-10/12`、カード内部の余白も拡大

15. デザイン刷新第6弾(レイアウト整列・ヘッダーの近未来化・発光演出)
    - 前回追加した`lg:mt-10`(カレンダー側の縦オフセット)が「ズレ」に見えるという
      フィードバックを受けて削除。ToDoリストとカレンダーの上端が揃うように修正
    - ヘッダーを近未来的なデザインに刷新: ロゴの背後にぼかした光の玉(グロー)を配置し、
      文字自体にも`drop-shadow`で発光効果を追加。ヘッダー背景を`backdrop-blur-2xl`の
      本格的なガラス質感にし、下端の境界線もindigoの光るシャドウに変更
    - メールアドレス表示を、光る小さなドット付きのガラス製ピルバッジに変更
    - `ThemeToggle.tsx`を、円形のガラスボタン(ホバー時に光るリングが浮かぶ)に変更
    - `LogoutButton.tsx`を、アイコン(扉から矢印が出るアイコン)付きのガラス製ピルボタンに
      変更。ホバー時に赤系の光る演出が出るようにした(ログアウトという操作の性質に合わせて)
    - `ParticleBackground.tsx`のライトモード時の粒子の色をより濃い`#4f46e5`に、
      サイズもわずかに大きく、コンテナの不透明度も`opacity-70`→`opacity-95`に引き上げ、
      はっきり視認できるようにした
    - タブの選択状態・「追加」ボタン・カレンダーのToDoがある日付マスに、
      box-shadowによる発光(グロー)効果を追加し、全体に「光っている」印象を強化

16. デザイン刷新第7弾(ヘッダー背景・パーティクル増量・アイコン・ロゴサイズ)
    - ヘッダー背景に、ページ全体の「光の玉」と同系色(indigo/violet)の
      radial-gradientによるグローを左右に配置し、ガラス質感と合わせて統一感を出した
    - パーティクルの数をPC版130→220個、スマホ版60→90個に増量
      (非表示タブでの停止・reduced motion時の静止といった既存のパフォーマンス対策はそのまま)
    - その後の追加要望で、パーティクル数をさらに3倍(PC版660個、スマホ版270個)に増量
    - さらに追加要望で、パーティクル数をもう3倍(PC版1980個、スマホ版810個。合計で
      最初の約15倍)に増量した上で、粒の大きさと色にもばらつきを追加。
      形については、`@react-three/drei`の`Sparkles`が内部的にすべて丸いグロー(光る点)
      として描画する仕様のため、丸以外の形(星型など)にするには自前でシェーダーを
      書く必要があり工数が大きくなる旨を説明し、ユーザーの選択で「丸のまま、
      大きさと色だけ多様化する」方針に決定
      - 実装時、`useMemo`内で`Math.random()`を呼ぶ形で実装したところ、Reactの新しい
        purityルール(`react-hooks/purity`、コンポーネントのレンダー中に副作用のある
        関数を呼んではいけないという規則)にESLintで引っかかった。修正として、
        乱数生成をコンポーネントのレンダーではなく**モジュール読み込み時に1回だけ**
        大きめのプールとして生成しておき、レンダー中は`count`に応じて
        `.subarray()`で切り出すだけ、という形に変更(切り出し自体は副作用のない
        決定的な操作なので、レンダー中に呼んでも問題ない)
    - その後さらに、粒の大きさを5倍(`buildSizePool`の生成式に`* 5`を追加)にし、
      「小さくきらめく星」から「大きな円が漂う」印象に変更。カラーパレットも
      indigo/violet中心の5色から、teal・赤・黄・オレンジ・シアンを加えた10色に拡張し、
      色のバリエーションを増やした
    - その後、賑やかすぎるとのことで粒の数を5分の1(PC版396個、スマホ版162個)に削減
    - さらにその後、粒の数を2倍(PC版792個、スマホ版324個)、大きさも2倍
      (サイズ生成式の係数`* 5`→`* 10`)に変更
    - 「ダークモードはいいが、ライトモードだけぼかしが強く感じる」というフィードバックを
      受けて調査。粒のソフトな輪郭(グロー)自体はシェーダー由来でモード共通のため、
      本当の原因は「同じぼかし方でも、白背景の上では低アルファのハローが目立ちやすく、
      黒背景の上ではほぼ見えなくなる」という背景色とのコントラストの違いだった。
      ダークモードはそのままに、ライトモードの粒のサイズだけ0.7倍に縮小することで、
      ハローの範囲を狭めて「ぼかしすぎ」の印象を和らげた
    - アイコンライブラリ`lucide-react`を新規導入し、ヘッダーの📝絵文字を
      ToDoアプリらしい`ListTodo`アイコンに変更。ロゴの発光効果(drop-shadow)も適用
    - ヘッダーの「ToDo.」ロゴ文字を`text-2xl`→`text-3xl sm:text-4xl`に拡大

17. iPhoneのホーム画面に追加できるPWA(Progressive Web App)対応
    - `app/manifest.ts` — アプリ名・アイコン・`display: "standalone"`(アドレスバーなしの
      全画面表示)などを記述するWeb App Manifest。Next.jsのファイル規約により、
      `<link rel="manifest">`タグが自動で`<head>`に追加される
    - `app/icon.tsx` / `app/apple-icon.tsx` — 画像ファイルを用意する代わりに、
      `next/og`の`ImageResponse`でコードからアイコンを生成。中身は
      `lucide-react`の`ListTodo`アイコン(ヘッダーと同じもの)をindigo→violet
      グラデーションの上に配置したもの。`icon.tsx`は角丸(通常のfavicon/PWAアイコン用)、
      `apple-icon.tsx`は角を丸めない正方形(iOS側で自動的に角丸マスクが掛かる仕様のため)
      で、透過なしの不透明な背景にしている
    - `app/layout.tsx`に`appleWebApp`(ホーム画面起動時のタイトル・ステータスバーの
      見た目)と`other: {"apple-mobile-web-app-capable": "yes"}`を追加。この
      `apple-mobile-web-app-capable`が、ホーム画面から起動したときにSafariの
      アドレスバーを消して全画面のアプリらしい見た目にするための一番重要な指定
    - あわせて`viewport`に`themeColor: "#4f46e5"`(indigo)を設定
    - 検証: `curl`でNext.jsが生成した`<head>`のタグ(manifest/icon/apple-touch-icon/
      各種meta)が正しく出力されていることと、生成された各アイコン画像を実際に確認。
      Playwrightの iPhone 13 デバイスエミュレーションでもコンソールエラーが
      発生しないことを確認済み。実機のiPhoneでの「ホーム画面に追加」の最終確認は
      ユーザー側で実施予定

18. 締切が近いToDoのリマインダー通知(Web Push、iPhoneのPWAへの通知対応)
    - **通知タイミング**: 毎朝8時(JST)に1回、Vercel Cron Jobsで定期実行し、
      「今日締切」「明日締切」の両方をまとめてチェックする方式(iOS Safariには
      決まった時刻にローカル通知を予約する仕組みがない=Notification Triggers API
      未対応のため、サーバー側から都度プッシュを送る設計が必須)
    - **新しいSupabaseテーブル/関数**(SQL EditorでユーザーがVault経由で設定):
      - `push_subscriptions`テーブル(端末ごとの通知の宛先情報、RLSで本人の行のみ)
      - `todos`に`day_before_reminder_sent` / `due_day_reminder_sent`(二重送信防止フラグ)を追加
      - `get_due_reminders(p_secret)` / `mark_reminder_sent(p_secret, ...)` /
        `delete_push_subscription(p_secret, ...)` — 全ユーザーを横断チェックする必要が
        あるため`security definer`関数として実装。認証は`p_secret`引数と
        **Supabase Vault**(`vault.decrypted_secrets`)に保存した`CRON_SECRET`を照合する形。
        「`service_role`キーは使わない」という既存方針を崩さずに済ませるための設計
    - **VAPID鍵・CRON_SECRET**: Supabase/Anthropicのキーと違い外部サービスは不要で、
      `web-push generate-vapid-keys`とNode.jsの`crypto.randomBytes`でその場で生成できる。
      `.env.local`に保存し、Vercel側の環境変数にも同じ値を追加する必要がある
    - `public/sw.js` — Service Worker。プッシュ受信時に`showNotification()`で表示、
      通知クリックでアプリを開く/フォーカスする処理
    - `app/components/NotificationSettings.tsx` — 通知オン/オフの設定UI。
      `navigator`/`window`に依存するため`ParticleBackground`と同様
      `NotificationSettingsLoader.tsx`経由で`next/dynamic`(`ssr: false`)にして、
      サーバーサイドレンダリング時にcrashしないようにしている。iPhoneで
      「ホーム画面に追加」せずSafariタブのまま開いている場合は、その旨を案内する文言を表示
      (iOSはstandalone表示時のみ通知許可をリクエストできる制約があるため)
    - `app/notifications/actions.ts` — 購読の登録/解除、および開発中に動作確認しやすくする
      ための「テスト通知を送る」Server Action(ユーザーからの要望で追加)
    - `app/api/send-reminders/route.ts` — Vercel Cronから呼ばれるAPI。
      `Authorization: Bearer $CRON_SECRET`ヘッダーを検証してから
      `get_due_reminders`をRPC呼び出しし、`web-push`で送信。410/404
      (購読が無効になった端末)は`delete_push_subscription`で自動クリーンアップ
    - `vercel.json` — `crons`設定。`"0 23 * * *"`(UTC 23:00 = JST 8:00)で
      Hobbyプランの「1日1回まで」という制限内に収まることを公式ドキュメントで確認済み
      (Hobbyプランは時刻の厳密さは保証されないが±59分程度のズレは今回の用途では許容範囲)
    - `app/todos/actions.ts`の`updateDueDate`で、締切日を変更した際に両方の
      reminder_sentフラグをリセットするよう修正(カレンダーへのドラッグ移動で
      締切日を変えた場合も、新しい日付に対して正しく再度通知されるようにするため)

### トラブルシューティング記録: SQLの構文ミスと秘密情報のチャット露出

この機能の実装過程で、ユーザーのレビューにより2つの問題を実装前に発見・修正した。

1. **SQLの構文エラー**: 最初に提示したSQL(`get_due_reminders`等のPL/pgSQL関数)に、
   UPDATE文が構文的に不完全な箇所があった。目視確認だけでは見逃しており、
   以後は`libpg-query`(Postgres本体と同じ構文解析ロジックを使うnpmパッケージ)で
   機械的に構文チェックしてから提示するように変更した(ただし、この方法は
   関数本体=`$$...$$`の中のplpgsql制御構文までは検証できないため、その部分は
   個々のSQL文を単体で抽出して検証し、IF/END IFなどの制御構文は手動で入念にトレースする、
   という二段構えで対応した)
2. **CRON_SECRETを平文でSQLに埋め込み、チャットに露出させてしまった**: 最初の実装案では
   秘密の値を関数のソースコードに直接書いていたため、この会話のログにも値が残ってしまった。
   ユーザーの指摘を受け、値そのものを一切チャットに出さない方式に変更(以降、値の生成後は
   `.env.local`に直接書き込むのみで、チャット上には出さない)。会話に一度出てしまった値は
   「漏れた」ものとして扱い、新しい値に再生成した

### トラブルシューティング記録: `ALTER DATABASE ... SET`がSupabaseで権限エラー

CRON_SECRETをPostgresのデータベース単位の設定値(`current_setting`)として保存する方式を
最初に試みたが、`alter database postgres set app.cron_secret = '...'`を実行したところ
`ERROR: 42501: permission denied to set parameter "app.cron_secret"`となった。

原因は、Supabaseのようなマネージド環境では、ユーザーに割り当てられる`postgres`ロールが
実際にはスーパーユーザーではなく、データベース単位の設定変更(`ALTER DATABASE ... SET`)に
必要な権限を持っていないため。

修正は、Supabase公式の**Vault**(`supabase_vault`拡張。秘密情報を暗号化してテーブルに保存し、
`vault.decrypted_secrets`という復号化ビュー経由でのみ読み出せる仕組み)に切り替えること。
`security definer`関数(所有者=管理者権限で実行される)の中から`vault.decrypted_secrets`を
参照することで、`anon`ロール自体には直接のVaultアクセス権がなくても、関数経由でなら
正しく値を比較できる。GitHub上のSupabase Vault公式リポジトリで実際の関数シグネチャ
(`vault.create_secret(secret, name, description)`)を確認した上で実装した。

### トラブルシューティング記録: Vault登録時に余分な1文字が混入し、認証が失敗

Vault切り替え後、`get_due_reminders`のRPC呼び出しが常に`unauthorized`エラーになる問題が
発生した。`select length(decrypted_secret) from vault.decrypted_secrets where name = 'cron_secret';`
で確認したところ、本来64文字であるべき値が65文字になっており、SQL Editorへのコピー&ペースト時に
行末の改行文字までうっかり選択・貼り付けしてしまっていたことが原因と判明。
`delete from vault.secrets where name = 'cron_secret';`で一度削除してから、
改行を含めず64文字ちょうどを慎重にコピーして`vault.create_secret()`をやり直すことで解決した。
**教訓**: Vaultや環境変数に秘密の値を手動でコピー&ペーストする際は、行末の改行や
前後の空白を含めていないか、文字数などで検証すること。

### トラブルシューティング記録: PlaywrightでのPush通知テストの限界

「テスト通知を送る」ボタンを含む一連の実装をPlaywrightで検証しようとしたところ、
2つの既知の制約に当たった。

1. Playwrightの通常の`newContext()`はChromeから見て「シークレットモード」相当として
   扱われ、Chromeはシークレットモードでのpush API利用を意図的にブロックしている
   (`chromium.launchPersistentContext()`で永続プロファイルを使うことで回避可能)
2. 永続プロファイルに切り替えても、Playwrightが同梱する(Google公式ブランドではない)
   Chromiumビルドには、Google Push Serviceとの通信に必要なAPIキーが組み込まれておらず、
   `push service not available`エラーになる。一般的なインターネット接続自体は
   問題なく機能していることを`curl`で確認済みのため、ネットワーク制限ではなく
   テストツール(Chromiumビルド)側の既知の制約と判断した

このため、サーバー側のロジック(API認証、Supabase RPC呼び出し、Vault連携)は`curl`での
直接テストで十分に検証できたが、「実際にブラウザでpush購読が成立し、プッシュが届く」という
最後の部分は、実機のiPhone(またはGoogle公式ビルドのChrome)でユーザー自身に確認して
もらう必要がある。

19. カンバンボード(3列: 未着手/進行中/完了)を追加
    - **データベースの変更**: 今までの`completed`(true/false の2値)だけでは「進行中」を
      表現できないため、`status`列(text型、`not_started` / `in_progress` / `completed`
      の3値、check制約で保証)を追加。既存の`completed`値から`status`を初期化した上で、
      `completed`列を一旦削除し、**「`status = 'completed'`のときだけtrueになる
      自動計算列(`generated always as ... stored`)」として再作成**した。これにより、
      締切リマインダー通知のVault保護されたSQL関数(`get_due_reminders`等)は
      `completed`列を見ているだけなので、一切変更せずに動作し続けている
    - **自動計算列への対応**: `completed`が自動計算列になったことで直接書き込めなくなったため、
      `app/todos/actions.ts`の`toggleTodo`を`updateTodoStatus(id, status)`に置き換え、
      チェックボックスのオン/オフも含めすべての完了状態の変更を`status`列の更新経由に統一した
      (チェックボックスは今まで通り2状態のまま: オンで`completed`、オフで`not_started`に戻る。
      「進行中」はボード上のドラッグでのみ設定可能)
    - `app/components/TodoItem.tsx`の`Todo`型を`completed: boolean`から
      `status: TodoStatus`(`"not_started" | "in_progress" | "completed"`)に変更。
      これに伴い、`TodoApp.tsx`(残り件数の集計)、`Calendar.tsx`(カレンダーチップの
      取り消し線表示)も`status`ベースの判定に書き換え
    - `app/components/KanbanBoard.tsx`(新規)— 3列(未着手/進行中/完了)。列は
      `useDroppable`、カードは`useDraggable`(既存の`@dnd-kit`を使用、列をまたぐ
      ドラッグのみ対応。同じ列内でのカードの並び替えは今回のスコープ外)
    - `TodoBoard.tsx`の共有`DndContext`の`onDragEnd`に「kanban-columnへのドロップ」の
      分岐を追加(calendar-day/list-itemの分岐と同じ構造)。表示は、ユーザーの希望により
      既存の「リスト+カレンダー」の横並びレイアウトはそのままに、ボードをその下に
      3つ目のセクションとして常時表示する形にした(タブ切り替えにはしていない)
    - 検証: Playwrightでボードへのドラッグによる状態変更・リロード後の永続化・
      チェックボックスとの相互連動・既存のリスト並び替え/カレンダードラッグの回帰確認・
      スマホ幅での列の縦積み・ダークモードの見た目を一通り確認済み

20. AIとチャットでToDoを操作する機能(Tool Use)
    - `app/chat/actions.ts` — `sendChatMessage`が本体。`ai`パッケージの`tool()` +
      `generateText`の`tools`引数でTool Use(Function Calling)を実装。
      `listTodos`(一覧取得) / `addTodo` / `updateTodoStatus` / `updateDueDate` /
      `requestDeleteTodo`(削除の確認のみ、実際には削除しない)の5つのツールを定義
    - **削除の安全設計**: AIが呼び出せるのは`requestDeleteTodo`のみで、これは対象の
      ToDoを検索して返すだけで何も削除しない。実際の削除(`confirmDeleteTodo`)は、
      チャット画面に表示される「削除する」ボタンのクリックからのみ直接呼び出される
      (AIの会話の流れを一切経由しない)ため、AIがどう振る舞っても機械的に削除は
      発生しない設計
    - **横断アクセスなし**: 締切リマインダー機能と異なり、チャットの各ツールは
      常にログイン中ユーザー本人の`user_id`でしか操作しないため、
      `security definer`関数やVaultは不要。通常のRLS保護されたクライアントで実装
    - `chat_messages`テーブル(新規、`role`/`content`の単純な会話ログ。RLSで本人の行のみ)
      に会話履歴を保存し、`app/page.tsx`で読み込んでチャットの初期状態として渡す
    - `app/components/AiChat.tsx` — チャットUI。削除確認はメッセージに紐づく
      「削除する/しない」ボタンとして表示され、クリック後は「削除しました」
      「キャンセルしました」に置き換わる

### トラブルシューティング記録: AIがツールを呼ばずに「実行しました」と嘘の返答をする

実装・検証の過程で、深刻な問題を2つ発見し修正した。いずれも動作はエラーなく成功して見えるため、
実際にデータベースの中身を確認するまで気づきにくいタイプの不具合だった。

**問題1: Claude Haiku 4.5が、ツールを一切呼び出さずに操作が成功したかのような文章を
返すことがあった**。たとえば「買い物のタスクを7月20日に延期して」と頼むと、
「締切を7月20日に変更しました」ともっともらしく返答するが、実際には`updateDueDate`は
一度も呼ばれておらず、データベースの値は変わっていなかった。会話ログを見るだけでは
気づけず、`generateText`の戻り値の`toolCalls`/`toolResults`を実際にログ出力して
初めて「空配列」であることが判明した。これは`toolChoice`の既定値(`"auto"`)では、
モデルが「データを変更する」系のツール呼び出しを省略して直接答えてしまうことがある、
という信頼性の問題だった。

修正は、`prepareStep`コールバックで**最初のステップ(`stepNumber === 0`)だけ
`toolChoice: "required"`を強制**すること。これにより、モデルは必ず何らかのツール
(多くの場合意図に応じた適切なツール)を1回は呼んでから応答するようになった
(2ステップ目以降は`"auto"`のままなので、ツール実行結果を踏まえた自然な文章での
最終回答は引き続き可能)。

**問題2: 削除確認ボタンが表示されないことがあった**。`requestDeleteTodo`が
呼ばれているはずなのに、返ってくる`result.toolResults`(トップレベル)が
空になっており、ボタン表示用のデータを拾えていなかった。原因は、
`GenerateTextResult`の`toolCalls`/`toolResults`は**最後のステップの分だけ**を
表す仕様だったこと(複数ステップに渡って呼ばれたツールは、最後が普通のテキスト
応答ステップであれば、トップレベルのプロパティには反映されない)。
修正は、`result.steps`(全ステップの配列)を走査し、各ステップの`toolResults`から
`requestDeleteTodo`の結果を集める形に変更した。

**教訓**: Tool Useを使う機能は、チャット上の返答が自然に見えても、実際にツールが
呼ばれてデータが変わったかを都度データベースで直接確認しながら検証すること。
「会話ログ上は成功しているように見える」ことと「実際に処理が実行された」ことは
別物として扱う必要がある。

21. 「リスト・カレンダー」「ボード」「チャット」のタブ切り替え化(その後「ボード」と
    「チャット」を1つのタブに統合し、最終的に2タブ構成に)
    - それまで`TodoBoard.tsx`は、通知設定の下に「リスト+カレンダー」「ボード」
      「チャット」を常時すべて縦に並べて表示していたが、ユーザーの要望によりタブで
      1つずつ切り替える形に変更した(通知設定だけはタブの外、常時表示のまま)
    - タブの切り替えは、非表示のタブを`hidden`クラス(`display: none`)で隠すだけで、
      DOMからアンマウントはしない方式にした。理由は、AIチャットの入力途中のテキストや
      各コンポーネントの内部状態を、タブを切り替えても保持するため
    - 表示中のタブだけ`className="contents"`(`display: contents`)を使い、
      親の`flex flex-col gap-8`のレイアウトに直接子要素として参加させることで、
      タブ用のラッパーdivが余分な余白や入れ子構造を生まないようにしている
    - ドラッグ&ドロップの`DndContext`は分割せず、タブの外側で1つのまま維持
      (非表示のタブには対応するDOM要素が実質存在しない状態になるため、
      特に問題は起きない)
    - その後、ユーザーの要望で「ボード」と「チャット」を1つのタブ(「ボード・チャット」)に
      統合し、現在は「リスト・カレンダー」「ボード・チャット」の2タブ構成になっている
    - 同じ時期に、AIチャットのメッセージ一覧が固定の高さでウィンドウ内スクロールに
      なっていたのを、`max-h-96 overflow-y-auto`を外してチャットの内容量に応じて
      ウィンドウ自体が伸びる形に変更した(ページ全体のスクロールに任せる形)

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

### トラブルシューティング記録: `background-color`と`background-image`の重ね掛けでダークモードのカード背景が白いまま残る

デザイン刷新第3弾で、ToDo1件分の行(`TodoItem.tsx`)の背景に、他のカードと同様グラデーションの
質感を加えようとしたところ、ダークモードに切り替えても行の背景が白いまま(文字も白色のため
実質見えない状態)になる不具合が発生した。

原因はCSSプロパティの衝突。要素にはもともとライトモード用の`bg-white`(`background-color`を
指定するユーティリティ)が指定されており、そこにダークモード用として`dark:bg-gradient-to-br
dark:from-white/[0.06] dark:to-indigo-500/[0.03]`(`background-image`でグラデーションを描く
ユーティリティ)を追加した。この2つは**別々のCSSプロパティ**(`background-color`と
`background-image`)を指定するため、ダークモードになっても`bg-white`によって設定された
`background-color: white`は上書きされず、その上にほぼ透明なグラデーションが重なるだけで、
見た目はほぼ白のまま変化しなかった。

修正は`dark:bg-transparent`を追加し、ダークモード時に`background-color`を明示的に透明へ
リセットすること。他のカード(`TodoApp.tsx`、`Calendar.tsx`、ログイン/サインアップ)は
最初からlight/dark両方とも`bg-gradient-to-br ...`(`background-color`を使わずグラデーションのみ)
で統一していたため、この問題は起きていなかった。
**教訓**: `bg-white`のような単色の背景ユーティリティと`dark:bg-gradient-to-br`のような
背景画像系ユーティリティを併用するときは、ダークモード側で`background-color`を明示的に
リセット(`dark:bg-transparent`)しないと、ライトモード用の単色が透けて残ったままになる。

### トラブルシューティング記録: ライトモードでパーティクルが完全に描画されない(ページ背景の不透明度によるレイヤー問題)

デザイン刷新第3弾で「ライトモードでもパーティクル演出がうっすら見えるようにする」対応をした際、
粒子の色を変えるだけでは直らず、Playwrightで詳細に調査したところ、ライトモードでは
パーティクルのCanvasが**完全に何も描画されていない**(色を目立つ赤に変えてもサイズを
大きくしても一切表示されない)ことが判明した。ダークモードでは同じコードで問題なく
表示されるため、色や不透明度の調整では説明がつかない現象だった。

原因は、`app/page.tsx`のページ全体を覆う背景(`bg-gradient-to-b from-zinc-100 ...`)が
ライトモードでは**完全に不透明**(すべての色に透過度指定がない)だったこと。パーティクルの
Canvas(`ParticleBackground.tsx`)は`fixed`+`-z-10`でこの背景より奥に配置しているが、
背景が完全に不透明だと、ブラウザが「奥のレイヤーは画面に映らないので描画をスキップしてよい」
と判断し、実際にCanvasの描画自体が行われなくなる(パーティクルが「隠れて見えない」のではなく
「そもそも描かれていない」)。ダークモードの背景は`dark:via-indigo-950/25`という
半透明の色を含んでいたため、たまたまこの問題を回避できていた。

Playwrightで`document.querySelector('canvas').getContext('webgl2')`から`gl.readPixels()`を
使う検証方法は、フレームバッファがクリアされた後に読み取ってしまい常に0を返すため
あてにならず、実際のスクリーンショット(特に、パーティクルの色をわざと目立つ赤・巨大サイズに
変えて確認する方法)が最も確実な検証手段だった。

修正は、`app/page.tsx`のライトモード背景の色にわずかな透過度を指定すること
(`from-zinc-100/95 via-zinc-100/95 to-indigo-50/90`)。見た目にはほぼ違いがないレベルの
透過度で、ブラウザに「このレイヤーは完全な不透明ではない」と認識させ、奥のパーティクル
Canvasが正しく描画・合成されるようにした。
**教訓**: `fixed` + 負の`z-index`で装飾用のCanvas/レイヤーを背景に敷く場合、手前の
コンテナ側の背景色を完全に不透明(`from-x via-x to-x`のようにすべて透過度指定なし)にすると、
ブラウザの最適化によって奥のレイヤーの描画自体がスキップされることがある。装飾レイヤーを
使うページの背景色には、常にごくわずかでも透過度を持たせておくと安全。

22. AIチャット機能の4つの拡張(タスク自動分解・音声入力・週次サマリー・能動的な提案)
    - **①タスクの自動分解**: `app/chat/actions.ts`に`suggestSubtasks`ツールを追加。
      `requestDeleteTodo`と同じ設計で、AIが呼べるのは分割案(最大10件)を提案するだけの
      ツールで、実際には何も登録しない。実際の一括登録(`confirmAddSubtasks`)は
      チャット画面の「登録する」ボタンからのみ直接実行され、AIの会話の流れを経由しない。
      分割の元になったタスク自体は自動削除しない方針(消したい場合は別途削除を依頼する形)
    - **②音声でチャットに入力**: `app/components/AiChat.tsx`にマイクボタンを追加し、
      ブラウザ標準のWeb Speech API(`SpeechRecognition`)で音声をテキストに変換する。
      サーバーを経由せず追加コストもかからないが、非標準APIのためTypeScriptの標準DOM型に
      定義がなく、使う分だけの最小限の型を自前で宣言した。対応ブラウザの判定は
      `ThemeToggle.tsx`と同じ`useSyncExternalStore`パターン(値が変化しない場合の
      `subscribe`は何もしない関数でよい)を使い、サーバー/クライアントのハイドレーション
      不整合を避けている
    - **③週次サマリー**: `todos`に`completed_at`(完了日時)・`due_date_postponed_at`
      (締切を後ろ倒しにした日時)の2列を追加。それまでは`created_at`と現在の`status`/
      `due_date`しかなく、「いつ完了したか」「いつ延期したか」が分からず正確な週次分析が
      できなかったための追加。`updateTodoStatus`(`app/todos/actions.ts`と
      `app/chat/actions.ts`の両方)で完了/未完了の切り替え時に自動セット/クリアし、
      `updateDueDate`(同じく両方)で締切日が**今までより後ろの日付になったときだけ**
      `due_date_postponed_at`をセットする(前倒しや解除は「先延ばし」に含めない)。
      読み取り専用の新ツール`getWeeklySummaryData`が直近7日間のデータをまとめて取得し、
      AIが前向きなトーンで傾向を答える。何も変更しないため確認ボタンは不要。
      「今週」は暦週(月曜始まり)ではなく、直近7日間のローリングウィンドウとして
      シンプルに実装している
    - **④AIが能動的に提案してくる**: `chat_messages`に`is_proactive`列を追加し、
      ユーザーに聞かれた発言かAIが自発的に発言したものかを区別できるようにした。
      新しい`checkProactiveSuggestion()`が、チャット画面(`AiChat.tsx`)が最初に
      表示されたタイミングで1回呼ばれ、(a)直近24時間以内に自発的な提案を既に
      送っていればそのまま何もせず、(b)未着手タスクが5件以上、または期限切れタスクが
      1件以上あれば、Claudeに短い前向きなコメントを生成させて`chat_messages`に
      `is_proactive: true`で保存し、画面に「✨ AIからの気づき」ラベル付きで表示する。
      サーバー側のCron Jobは使わず、「アプリを開いたときにチェックする」というシンプルな
      方式にした(締切リマインダーのプッシュ通知とは別物で、次にアプリを開いたときに
      チャット欄に増えている、という形になる)

### トラブルシューティング記録: React Strict Modeの開発時二重実行で、能動的な提案メッセージが画面に反映されないことがあった

④の実装中、サーバー側(`checkProactiveSuggestion`)は正しく動作してAIのコメントを
`chat_messages`に保存できているのに、画面には表示されないことがある、という不具合が
発生した。データベースを直接確認すると提案メッセージ自体は正しく作られており、
「サーバー側の処理が失敗している」わけではなかった。

原因は、`AiChat.tsx`側の`useEffect`が、開発環境(`next dev`)でのみ有効な
**React Strict Modeの二重実行**の影響を受けていたこと。Strict Modeは開発時のみ、
コンポーネントをマウント→(すぐに)アンマウント→再マウント、という形で
effectを2回実行し、副作用の後始末(cleanup)漏れを検出しやすくする仕組みになっている。
このとき、「後からの結果を反映しないようにする」ための一般的なガード
(`let cancelled = false; ... return () => { cancelled = true; }`)を書いていたことが
裏目に出た。1回目の実行が(AIの応答を待って)完了する頃には、Strict Modeの
偽アンマウントによって`cancelled`が`true`になっており、せっかく取得した提案メッセージが
「もう使われない」と判断されて捨てられていた。2回目の実行は、1回目がサーバー側で
既にメッセージを保存し終えていたため、24時間のクールダウン判定に引っかかって`null`を
返すだけだった。結果として、両方の実行が「何も表示しない」という結果に終わっていた。

この不具合は本番ビルドでは発生しない(effectの二重実行はStrict Modeによる開発時限定の
挙動で、本番ビルドでは行われない)が、開発中の動作確認が混乱するため、`cancelled`ガードを
撤去して修正した。この`useEffect`は「ページが開かれている間ずっとマウントされ続ける
コンポーネント(タブ切り替えでは`hidden`になるだけでアンマウントされない)」に対する
一度きりのチェックであり、サーバー側のデータベースへの書き込みはコンポーネントの
アンマウントで取り消せるものでもないため、そもそも中断用のガードを持つ意味がなかった。
**教訓**: `useEffect`内で非同期処理の結果を`cancelled`フラグで無効化するパターンは
一般的には正しいが、「その非同期処理がコンポーネントの外側(データベースなど)に既に
副作用を及ぼしていて、かつコンポーネントが実質アンマウントされない」ケースでは、
Strict Modeの二重実行と組み合わさって意図しない結果を招くことがある。

23. 起動時のローディング画面(スプラッシュ)を追加
    - `app/loading.tsx`(Next.js App Routerの規約ファイル。トップページのServer
      Componentがデータ取得している間、自動でSuspenseのfallbackとして表示される)
    - 新しいアプリアイコン(`/icon.png`)を中央に置き、その周りに2本のネオンのリング
      (conic-gradientをmaskでリング状にしたもの)を反対方向に回転させ、脈動する光の輪
      (halo)とアイコン自体の呼吸(scale + drop-shadow)を組み合わせた近未来的な演出。
      アニメーションは`globals.css`の`@keyframes loading-*`に定義し、
      `prefers-reduced-motion`では停止する
    - 背景は`from-black via-indigo-950 to-black`の完全不透明な暗いグラデーション
      (最初`via-indigo-950/40`にしたらライトモードで真ん中に白い帯が透けたため、
      不透明に修正)。ライト/ダークどちらでも暗いスプラッシュとして一貫して見えるようにした
    - 検証: ローディングを目視確認するため`page.tsx`に一時的な`setTimeout`遅延を入れて
      Playwrightでスクリーンショットを撮り(確認後に遅延は削除)、本番では`/`のストリーム
      HTMLに`animate-loading`マークアップが含まれることをcurlで確認。ログイン→アプリ表示の
      回帰も確認済み

24. 「ToDoリストから消してもカレンダーには過去の記録として残す」論理削除(ソフトデリート)
    - **動作**: リスト/ボード/AIチャットの「削除」を論理削除に変更した。
      - **締切日があるタスク** → 実際には消さず`deleted_at`に日時を入れて「リスト・ボード・
        チャットからは見えなくなるが、カレンダーには薄いグレーの『削除済み』記録として残る」
      - **締切日がないタスク** → カレンダーに表示する場所がないので今まで通り完全削除
      - カレンダー上の「削除済み」記録をタップ → 詳細モーダルが「完全に削除」専用の表示に
        なり、そこから`permanentlyDeleteTodo`でDBから完全に消せる
    - **通知からの除外**: 「リストから消したがカレンダーに残っている」タスクに締切リマインダーが
      誤って届かないよう、Vaultで保護された`get_due_reminders`関数に`and t.deleted_at is null`
      を追加する必要がある(下記SQL参照)
    - **見た目**: カレンダーのチップとDayTasksModal(「+N件」一覧)で、削除済みは
      グレー+斜体+取り消し線+opacityを落とした控えめな表示にし、通常タスクと区別。
      削除済みチップはドラッグ不可(`useDraggable`の`disabled`)だがクリックは可能
    - **実装ファイル**: `app/todos/actions.ts`(`deleteTodo`を論理削除化 +
      `permanentlyDeleteTodo`新設)、`app/chat/actions.ts`(`confirmDeleteTodo`を論理削除化 +
      listTodos/getWeeklySummaryData/checkProactiveSuggestionのクエリに`.is("deleted_at", null)`)、
      `app/page.tsx`(selectに`deleted_at`追加)、`TodoItem.tsx`(Todo型に`deleted_at`)、
      `TodoBoard.tsx`(activeTodos=削除済み除外をリスト/ボードへ、全件をカレンダーへ。
      楽観的更新に`softDelete`アクション追加)、`Calendar.tsx` / `DayTasksModal.tsx`
      (削除済みの控えめ表示)、`TodoDetailModal.tsx`(削除済み向けの「完全に削除」表示)

    #### ✅ 実行・デプロイ済み(2026-07-21)

    > 下記SQLはユーザーがSupabase SQL Editorで実行済み(2026-07-21)。実行時、(A)の
    > `deleted_at`列追加は「すでに存在します」というエラーになったが、これは以前の
    > 別作業で同じ列がすでに作成済みだったためで、確認クエリで列の存在自体は問題ないと
    > 確認できている。(B)の`get_due_reminders`関数更新はエラーなく完了。その後
    > コミット`5351389`をpush・本番デプロイし、Playwrightで以下を確認済み:
    > 締切ありタスクの削除→リストから消える→カレンダーに控えめな表示で残る→
    > クリックで詳細モーダル(「リストから削除済み」表示)→「完全に削除」でカレンダーからも
    > 消える→リロード後も反映が正しいこと。コンソールエラーなし。

    ```sql
    -- ============================================================
    -- (A) 論理削除用の列を追加(既存の行はすべて NULL = 未削除 になる)
    -- ============================================================
    alter table public.todos add column deleted_at timestamptz;

    -- ============================================================
    -- (B) リマインダー通知から「論理削除済み」タスクを除外する。
    --     既存の get_due_reminders 関数に「and t.deleted_at is null」を
    --     1行足しただけ(それ以外は README のリマインダー節と同一)。
    --     CREATE OR REPLACE なので、そのまま実行すれば関数が置き換わる。
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
        and t.deleted_at is null      -- ← 今回追加(論理削除済みは通知しない)
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
    ```

## 今後の予定(未着手)

特になし。項目24(論理削除)はSQL実行・デプロイ・本番検証まで完了済み。

### トラブルシューティング記録: 楽観的UI更新の直後(サーバーへの反映前)に同じ項目を操作すると、その操作だけが静かに失われることがある

項目24の本番デプロイ後の検証中に見つかった、既存の(このセッションが原因ではない)軽微な
制約。`TodoBoard.tsx`の`handleDelete` / `handleSaveEdit` / `handleDragEnd`(締切日の
ドラッグ変更)は、`TodoItem.tsx`のチェックボックス(完了切り替え)とは異なるパターンで
実装されている。チェックボックスは
`startTransition(async () => { onStatusChange(...); await updateTodoStatus(...); })`
のように、楽観的更新とServer Action呼び出しの両方を**同じtransition内でawait**しているが、
削除・編集・カレンダードラッグは楽観的更新だけを`startTransition`に包み、Server Action
(`deleteTodo`等)は**transitionの外・awaitなし**で呼んでいる(fire-and-forget)。

通常の使い方では問題にならないが、「ToDoを追加した直後(サーバーへの保存・再検証が
完了する前の、ごく短い時間)に、その同じToDoを編集・削除・ドラッグで操作する」という
非常に速い操作をすると、その時点でまだ画面に表示されているのは追加処理側の楽観的UI
(クライアントが仮に振った一時的なID)であり、操作対象のIDが実際のデータベース上の
IDとまだ一致していない。この状態で削除等を呼ぶと、サーバー側は該当IDの行を
見つけられず(`existing`が`null`)、何も変更されずに静かに終わる(エラーは出ない)。
検証はPlaywrightで自動化した操作(追加ボタンを押した直後に間を置かず次の操作をする)
で発生を確認したが、人間が実際に使う速度ではまず起こらないと考えられる。

この問題は今回の論理削除機能が原因ではなく、`updateTodo` / `updateDueDate`(カレンダー
ドラッグでの締切変更)にも同じパターンで以前から存在していた可能性が高い。そのため、
このセッションでは根本修正(全箇所をチェックボックスと同じawait方式に統一するといった
リファクタ)はせず、既知の制約として記録するに留めた。もし将来「追加した直後に
素早く操作すると反映されないことがある」という報告があれば、この記録を参照し、
`handleDelete` / `handleSaveEdit` / `handleDragEnd`のServer Action呼び出しを
チェックボックスと同じ「transition内でawait」する形に統一する対応を検討すること。

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
- **`icon.png` / `apple-icon.png`(静的画像ファイル)の破壊的変更**: `app/icon.tsx`のような
  コード生成ではなく`app/icon.png`という静的画像ファイルを置く場合、このNext.jsバージョンでは
  拡張子付きの`/icon.png`というパスで配信される(コード生成方式の`/icon`という拡張子なしパスとは
  異なる)。`app/manifest.ts`の`icons`配列など、パスを自前で記述している箇所は
  `/icon.png` / `/apple-icon.png`と拡張子まで書く必要がある(拡張子なしの`/icon`のままだと
  404になり、Androidでの「ホーム画面に追加」時のアイコンが表示されない)。
