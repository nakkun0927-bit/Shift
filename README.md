# シフト表アプリ（Netlify）

社外共有用の「閲覧ページ」と、社内向けの「管理者ページ（ログイン制）」がセットになったアプリです。

- `/`（index.html） … 誰でも見られる、スマホ最適化されたシフト一覧（閲覧のみ）
- `/admin`（admin.html） … ログインしたスタッフだけがメンバー・シフトを編集できる管理ページ
- データの保存には Netlify Blobs（追加登録不要の内蔵ストレージ）を使っています。データベースを別途契約する必要はありません。
- 認証には Netlify Identity（Netlify 標準のログイン機能）を使っています。

## 1. GitHubリポジトリを作る

1. GitHub で新しいリポジトリを作成します（例: `shift-schedule`）。
2. このフォルダの中身をそのままリポジトリに push してください。

```bash
cd shift-schedule-app   # このフォルダ
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/<あなたのアカウント>/<リポジトリ名>.git
git push -u origin main
```

## 2. Netlifyでサイトを作る

1. Netlify にログイン → **Add new site → Import an existing project**
2. さきほどの GitHub リポジトリを選択
3. ビルド設定はそのまま（`netlify.toml` に書いてあるので、Publish directory や Functions directory は自動で認識されます）
4. **Deploy site** をクリック

これで閲覧ページ（`https://（自動生成された名前）.netlify.app/`）と管理ページ（同URL + `/admin`）が公開されます。デプロイ直後はサンプルデータ（仮のメンバー・シフト）が自動で表示されます。

## 3. ログイン機能（Netlify Identity）を有効にする

1. Netlify の管理画面で対象サイトを開き、**Site configuration → Identity** を開く
2. **Enable Identity** をクリック
3. **Registration preferences** を **Invite only**（招待制）に変更 ← これをしないと誰でも自分でアカウントを作れてしまうので必ず設定してください
4. **Identity → Invite users** から、管理ページを使わせたいスタッフのメールアドレスを入力して招待メールを送信
5. 招待されたメンバーは、メール内のリンクからパスワードを設定すればログインできます

管理者を増やしたい／減らしたいときも、この Identity 画面から招待・削除するだけでOKです。

## 4. 使い方

### 管理者（ログインした人）
- `/admin` にアクセスしてログイン
- 「メンバー管理」で氏名の追加・削除・修正 → 「メンバー構成を保存」
- 「月のシフト管理」で対象月を選択 → 表に直接入力（プルダウン候補あり、自由入力も可）→ 「このシフトを保存」
- 「＋ 新しい月を追加」で年・月を指定すると、その月の日付が自動生成されます。「前月と同じ並びをコピー」にチェックすると前月のシフトを下敷きにした下書きができるので、そこから修正するだけで済みます
- 特定の月だけ削除したい場合は「この月を削除」

### 閲覧者（社外の方）
- `/` のリンクをそのまま送るだけ。ログイン不要、スマホでそのまま見られます
- 上部のプルダウンで過去の月も確認できます

## カスタマイズ

- 配色・文言は `public/assets/style.css` と各 `.html` / `.js` を編集してください。
- 勤務パターンの候補（プルダウン）は `public/admin.html` の `<datalist id="presets">` と `public/assets/admin.js` の `PRESET_VALUES` を編集してください。
- ロゴや会社名を入れたい場合は `public/index.html` と `public/admin.html` の `<header>` 部分を編集してください。

## ローカルで試したい場合

```bash
npm install -g netlify-cli
netlify login
netlify link      # 作成したNetlifyサイトと連携
netlify dev        # http://localhost:8888 でIdentity・Blobsを含めて動作確認できます
```
