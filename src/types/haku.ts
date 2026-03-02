export type EmotionType = 'joy' | 'calm' | 'sad' | 'anger' | 'anxiety' | 'gratitude';

export interface Emotion {
  type: EmotionType;
  intensity: number; // 0.1 ~ 1.0
}

export interface JournalEntry {
  id: string; // uuid
  user_id: string; // uuid
  transcript: string | null;
  diary_text: string;
  ai_response: string;
  emotions: Emotion[]; // データベース上は jsonb
  is_bookmarked: boolean; // default false
  created_at: string; // timestamptz
}

export interface Profile {
  id: string; // uuid (references auth.users.id)
  is_premium: boolean; // default false
  stripe_customer_id: string | null;
  created_at: string;
}
