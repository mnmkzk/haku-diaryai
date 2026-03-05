# haku - AI カウンセリング日記

haku は、ユーザーの心の声を深く受け止め、寄り添う AI カウンセリング日記アプリです。
来談者中心療法の理論に基づいた対話体験を提供し、日々の感情の整理をサポートします。

## 🛠 技術スタック

- **Frontend**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS, Framer Motion (Animations)
- **Backend / Auth**: Supabase
- **AI**: Google Gemini API (1.5 Flash)
- **Icons**: Lucide React

## 🚀 ローカル開発環境の構築

### 1. リポジトリのクローンと依存関係のインストール

```bash
cd haku-app
npm install
```

### 2. 環境変数の設定

`haku-app` 直下に `.env.local` ファイルを作成し、以下の項目を設定してください。

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# Gemini API
GEMINI_API_KEY=your_api_key
```

### 3. 開発サーバーの起動

```bash
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開き、動作を確認します。

## 📤 Git での変更反映（プッシュ）の手順

変更を保存し、GitHub 等のリモートリポジトリへ反映させる一連のコマンドです。

```bash
# 1. すべての変更をステージングに追加
git add .

# 2. 変更内容を記録（コミット）
git commit -m "ここに変更内容のメッセージを書く"

# 3. リモートリポジトリ（GitHub等）へ送信
git push origin main
```

## 🌐 デプロイ (Vercel)

Vercel にデプロイする場合、管理画面の **Settings > Environment Variables** にて、上記の環境変数をすべて登録してください。登録後、Redeploy を行うことで本番環境が更新されます。

## 🧪 テストの実行

```bash
# 全テストの実行
npm test

# カバレッジの計測
npm run test:coverage
```
