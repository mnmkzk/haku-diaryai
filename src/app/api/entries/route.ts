import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { analyzeJournalEntry } from '@/lib/gemini';
import { v4 as uuidv4 } from 'uuid';

// Vercel timeout setting
export const maxDuration = 60;

export async function POST(req: Request) {
    try {
        const formData = await req.formData();
        const audioFile = formData.get('audio') as Blob | null;
        const textInput = formData.get('text') as string | null;

        if (!audioFile && !textInput) {
            return NextResponse.json({ error: 'No audio or text provided' }, { status: 400 });
        }

        // 1. Get user session
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = user.id;
        const entryId = uuidv4();
        const isVoice = !!audioFile;
        let aiData;

        if (isVoice && audioFile) {
            // 音声入力フロー
            // 2. Upload to Supabase Storage (audio_temp)
            const filePath = `${userId}/${entryId}.webm`;
            const { error: uploadError } = await supabase.storage
                .from('audio_temp')
                .upload(filePath, audioFile);

            if (uploadError) {
                console.error('Upload error:', uploadError);
            }

            // 3. Transcription & Analysis using Gemini 1.5 Flash
            const audioBuffer = Buffer.from(await audioFile.arrayBuffer());
            aiData = await analyzeJournalEntry(audioBuffer, audioFile.type || "audio/webm");

            // 5. Cleanup Storage
            supabase.storage.from('audio_temp').remove([filePath]);
        } else {
            // テキスト入力フロー（設計書: TextEdit → Processing → JournalDetail）
            aiData = await analyzeJournalEntry(textInput!, "text/plain");
        }

        // 4. Save to Database
        const emotionScores: Record<string, number> = {};
        if (Array.isArray(aiData.emotions)) {
            aiData.emotions.forEach(emo => {
                emotionScores[emo.type] = emo.intensity;
            });
        }

        const { data: entry, error: dbError } = await (supabase
            .from('journal_entries') as any)
            .insert({
                id: entryId,
                user_id: userId,
                raw_transcript: isVoice ? aiData.diary_text : textInput,
                rewritten_diary: aiData.diary_text,
                empathy_message: aiData.ai_response || "ごめんね、うまく言葉にできなかったみたい。",
                emotion_primary: (Array.isArray(aiData.emotions) && aiData.emotions[0]?.type) || 'neutral',
                emotion_scores: emotionScores,
                input_method: isVoice ? 'voice' : 'text',
                ai_processed_at: new Date().toISOString()
            })
            .select()
            .single();

        if (dbError) {
            console.error('Database error:', dbError);
            return NextResponse.json({ error: 'Failed to save entry' }, { status: 500 });
        }

        return NextResponse.json({
            id: entryId,
            diary_text: aiData.diary_text,
            ai_response: aiData.ai_response,
            emotions: aiData.emotions
        });

    } catch (error: any) {
        console.error('API Error:', error);
        return NextResponse.json({
            error: 'Internal Server Error',
            details: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        }, { status: 500 });
    }
}
