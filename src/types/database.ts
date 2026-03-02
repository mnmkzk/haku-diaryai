export type EmotionType = 'joy' | 'calm' | 'sad' | 'anger' | 'anxiety' | 'gratitude' | 'surprise' | 'neutral';

export type PlanType = 'free' | 'standard' | 'supporter';

export type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'trialing' | 'incomplete';

export interface Emotion {
    type: EmotionType;
    intensity: number; // 0.1 ~ 1.0
}

export interface Profile {
    id: string; // uuid (references auth.users.id)
    display_name: string | null;
    avatar_url: string | null;
    plan: PlanType;
    onboarding_done: boolean;
    privacy_agreed: boolean;
    privacy_agreed_at: string | null;
    timezone: string;
    created_at: string;
    updated_at: string;
}

export interface Subscription {
    id: string; // uuid
    user_id: string; // uuid
    stripe_customer_id: string | null;
    stripe_subscription_id: string | null;
    plan: PlanType;
    status: SubscriptionStatus;
    current_period_start: string | null;
    current_period_end: string | null;
    cancel_at_period_end: boolean;
    created_at: string;
    updated_at: string;
}

export interface JournalEntry {
    id: string; // uuid
    user_id: string; // uuid

    // 録音データ
    audio_duration: number | null;
    audio_url: string | null;

    // テキストデータ
    raw_transcript: string | null;
    edited_text: string | null;
    input_method: 'voice' | 'text';

    // AI処理結果
    rewritten_diary: string | null;
    empathy_message: string | null;
    emotion_primary: EmotionType;
    emotion_scores: Record<string, number>; // JSONB
    emotion_tags: string[]; // text[]

    // AIメタデータ
    ai_model: string | null;
    ai_prompt_version: string | null;
    ai_processed_at: string | null;

    // メタデータ
    recorded_at: string;
    created_at: string;
    updated_at: string;
}

export interface UsageLog {
    id: string; // uuid
    user_id: string; // uuid
    action: 'journal_create' | 'ai_analyze';
    period_key: string;
    created_at: string;
}

export interface Database {
    public: {
        Tables: {
            profiles: {
                Row: Profile;
                Insert: Partial<Profile> & { id: string };
                Update: Partial<Profile>;
            };
            subscriptions: {
                Row: Subscription;
                Insert: Partial<Subscription> & { user_id: string };
                Update: Partial<Subscription>;
            };
            journal_entries: {
                Row: JournalEntry;
                Insert: Partial<JournalEntry> & { user_id: string };
                Update: Partial<JournalEntry>;
            };
            usage_logs: {
                Row: UsageLog;
                Insert: Partial<UsageLog> & { user_id: string; period_key: string };
                Update: Partial<UsageLog>;
            };
        };
        Views: {
            monthly_usage: {
                Row: {
                    user_id: string;
                    period_key: string;
                    usage_count: number;
                };
            };
        };
    };
}
