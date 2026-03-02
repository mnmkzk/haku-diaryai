-- ============================================================
-- Haku データベーススキーマ（基本設計）
-- Supabase (PostgreSQL) 用
-- ============================================================

-- ========================================
-- 0. 拡張機能の有効化
-- ========================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ========================================
-- 1. カスタム型定義
-- ========================================

-- 感情タイプ
CREATE TYPE emotion_type AS ENUM (
  'joy',       -- 喜び
  'calm',      -- 穏やか
  'sad',       -- 悲しみ
  'anger',     -- 怒り
  'anxiety',   -- 不安
  'gratitude', -- 感謝
  'surprise',  -- 驚き
  'neutral'    -- 中立
);

-- サブスクリプションプラン
CREATE TYPE plan_type AS ENUM (
  'free',      -- 月3回制限
  'standard',  -- 回数無制限
  'supporter'  -- 開発応援
);

-- サブスクリプション状態
CREATE TYPE subscription_status AS ENUM (
  'active',
  'canceled',
  'past_due',
  'trialing',
  'incomplete'
);

-- ========================================
-- 2. テーブル定義
-- ========================================

-- ----------------------------------------
-- 2.1 profiles: ユーザープロフィール
-- Supabase Auth の auth.users と1対1対応
-- ----------------------------------------
CREATE TABLE profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name    TEXT,
  avatar_url      TEXT,
  plan            plan_type NOT NULL DEFAULT 'free',
  onboarding_done BOOLEAN NOT NULL DEFAULT FALSE,
  privacy_agreed  BOOLEAN NOT NULL DEFAULT FALSE,    -- 免責同意済みフラグ
  privacy_agreed_at TIMESTAMPTZ,                     -- 同意日時
  timezone        TEXT DEFAULT 'Asia/Tokyo',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE profiles IS 'ユーザープロフィール。auth.users と1対1対応。';
COMMENT ON COLUMN profiles.plan IS '現在のサブスクリプションプラン。Stripe Webhookで更新。';
COMMENT ON COLUMN profiles.privacy_agreed IS '「本サービスは医療行為ではない」旨の同意フラグ。';

-- ----------------------------------------
-- 2.2 subscriptions: サブスクリプション管理
-- Stripe との同期テーブル
-- ----------------------------------------
CREATE TABLE subscriptions (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id               UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  stripe_customer_id    TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  plan                  plan_type NOT NULL DEFAULT 'free',
  status                subscription_status NOT NULL DEFAULT 'active',
  current_period_start  TIMESTAMPTZ,
  current_period_end    TIMESTAMPTZ,
  cancel_at_period_end  BOOLEAN DEFAULT FALSE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE subscriptions IS 'Stripe サブスクリプションとの同期テーブル。';

CREATE UNIQUE INDEX idx_subscriptions_user ON subscriptions(user_id);

-- ----------------------------------------
-- 2.3 journal_entries: 日記エントリー（メインテーブル）
-- ----------------------------------------
CREATE TABLE journal_entries (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- 録音データ
  audio_duration  INTEGER,                -- 録音時間（秒）
  audio_url       TEXT,                   -- Supabase Storage URL（一時保存用）

  -- テキストデータ
  raw_transcript  TEXT,                   -- Whisper 文字起こし原文
  edited_text     TEXT,                   -- ユーザー編集後テキスト
  input_method    TEXT NOT NULL DEFAULT 'voice'
                  CHECK (input_method IN ('voice', 'text')),

  -- AI処理結果（暗号化保存推奨フィールド）
  rewritten_diary TEXT,                   -- Gemini リライト日記
  empathy_message TEXT,                   -- Gemini 共感レスポンス
  emotion_primary emotion_type DEFAULT 'neutral',         -- 主要感情
  emotion_scores  JSONB DEFAULT '{}',     -- 感情スコア {"joy":0.8,"calm":0.5,...}
  emotion_tags    TEXT[] DEFAULT '{}',    -- 感情タグ配列

  -- AI処理メタデータ
  ai_model        TEXT DEFAULT 'gemini-1.5-flash',
  ai_prompt_version TEXT DEFAULT 'v1',    -- プロンプトバージョン管理
  ai_processed_at TIMESTAMPTZ,

  -- メタデータ
  recorded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),  -- 録音日時（ユーザー体感時刻）
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE journal_entries IS '日記エントリー。音声→文字起こし→AI処理の全結果を保持。';
COMMENT ON COLUMN journal_entries.emotion_scores IS '各感情の強度スコア。例: {"joy":0.8,"calm":0.5}';
COMMENT ON COLUMN journal_entries.ai_prompt_version IS 'AI プロンプトのバージョン。プロンプト改善時の追跡用。';

-- パフォーマンス用インデックス
CREATE INDEX idx_journal_user_recorded ON journal_entries(user_id, recorded_at DESC);
CREATE INDEX idx_journal_emotion ON journal_entries(emotion_primary);

-- ----------------------------------------
-- 2.4 usage_logs: 利用量ログ
-- Freeプランの月間利用制限管理
-- ----------------------------------------
CREATE TABLE usage_logs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action      TEXT NOT NULL DEFAULT 'journal_create'
              CHECK (action IN ('journal_create', 'ai_analyze')),
  period_key  TEXT NOT NULL,  -- 'YYYY-MM' 形式: 月間集計キー
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE usage_logs IS '月間利用量の追跡。Freeプランの3回/月制限の判定に使用。';

CREATE INDEX idx_usage_user_period ON usage_logs(user_id, period_key);

-- ========================================
-- 3. 自動更新トリガー
-- ========================================

-- updated_at を自動更新する関数
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 各テーブルにトリガー設置
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_journal_entries_updated_at
  BEFORE UPDATE ON journal_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ========================================
-- 4. 新規ユーザー自動登録トリガー
-- auth.users にレコードが追加された時、profiles を自動作成
-- ========================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ========================================
-- 5. Row Level Security (RLS)
-- ========================================

-- 全テーブルでRLSを有効化
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_logs ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------
-- 5.1 profiles RLS ポリシー
-- ----------------------------------------

-- ユーザーは自分のプロフィールのみ参照可能
CREATE POLICY "profiles_select_own"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- ユーザーは自分のプロフィールのみ更新可能
CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- プロフィール作成はトリガー経由のみ（SECURITY DEFINER）
-- ユーザー自身のINSERTは不許可

-- ----------------------------------------
-- 5.2 subscriptions RLS ポリシー
-- ----------------------------------------

-- ユーザーは自分のサブスクリプションのみ参照可能
CREATE POLICY "subscriptions_select_own"
  ON subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- サブスクリプションの作成・更新はサーバーサイド（service_role）のみ
-- → API Routes で service_role キーを使用

-- ----------------------------------------
-- 5.3 journal_entries RLS ポリシー
-- ----------------------------------------

-- ユーザーは自分の日記のみ参照可能
CREATE POLICY "journal_select_own"
  ON journal_entries FOR SELECT
  USING (auth.uid() = user_id);

-- ユーザーは自分の日記のみ作成可能
CREATE POLICY "journal_insert_own"
  ON journal_entries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ユーザーは自分の日記のみ更新可能
CREATE POLICY "journal_update_own"
  ON journal_entries FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ユーザーは自分の日記のみ削除可能
CREATE POLICY "journal_delete_own"
  ON journal_entries FOR DELETE
  USING (auth.uid() = user_id);

-- ----------------------------------------
-- 5.4 usage_logs RLS ポリシー
-- ----------------------------------------

-- ユーザーは自分の利用ログのみ参照可能
CREATE POLICY "usage_select_own"
  ON usage_logs FOR SELECT
  USING (auth.uid() = user_id);

-- 利用ログの作成はサーバーサイドのみ
-- → API Routes で service_role キーを使用

-- ========================================
-- 6. Supabase Storage バケット設定
-- ========================================
-- 以下はSupabase Dashboard または supabase CLI で設定

-- バケット: audio-recordings
-- - 公開: false（非公開）
-- - ファイルサイズ上限: 10MB
-- - 許可MIMEタイプ: audio/webm, audio/mp4, audio/wav
-- - RLSポリシー:
--   SELECT: auth.uid() = (storage.foldername(name))[1]::uuid
--   INSERT: auth.uid() = (storage.foldername(name))[1]::uuid
--   DELETE: auth.uid() = (storage.foldername(name))[1]::uuid
-- - フォルダ構造: {user_id}/{journal_id}.webm
-- - 保持期間: 文字起こし完了後24時間以内に自動削除（Edge Function で実装）

-- ========================================
-- 7. ユーティリティビュー
-- ========================================

-- 月間利用回数の集計ビュー（Freeプラン制限判定用）
CREATE OR REPLACE VIEW monthly_usage AS
SELECT
  user_id,
  period_key,
  COUNT(*) AS usage_count
FROM usage_logs
WHERE action = 'journal_create'
GROUP BY user_id, period_key;

COMMENT ON VIEW monthly_usage IS 'Freeプランの月間利用回数判定に使用。3回/月の制限チェック。';

-- ========================================
-- 8. ER図（参考）
-- ========================================
-- 
-- ┌──────────┐     ┌───────────────┐     ┌───────────────┐
-- │auth.users│────→│   profiles    │────→│ subscriptions │
-- └──────────┘  1:1└───────────────┘  1:1└───────────────┘
--                        │ 1:N
--                        ▼
--               ┌───────────────┐
--               │journal_entries│
--               └───────────────┘
--                        │ 1:N
--                        ▼
--               ┌───────────────┐
--               │  usage_logs   │
--               └───────────────┘
