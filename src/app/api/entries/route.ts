import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { analyzeJournalEntry } from '@/lib/gemini';
import { v4 as uuidv4 } from 'uuid';

// Vercel timeout setting
export const maxDuration = 60;

export async function POST(req: Request) {
    try {
        const formData = await req.formData();
        const audioFile = formData.get('audio') as Blob;

        if (!audioFile) {
            return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
        }

        // 1. Get user session
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = user.id;
        const entryId = uuidv4();

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
        const aiData = await analyzeJournalEntry(audioBuffer, audioFile.type || "audio/webm");

        // 4. Save to Database
        // Convert array to record for database
        const emotionScores: Record<string, number> = {};
        aiData.emotions.forEach(emo => {
            emotionScores[emo.type] = emo.intensity;
        });

        const { data: entry, error: dbError } = await (supabase
            .from('journal_entries') as any)
            .insert({
                id: entryId,
                user_id: userId,
                raw_transcript: aiData.diary_text,
                rewritten_diary: aiData.diary_text,
                empathy_message: aiData.ai_response,
                emotion_primary: (aiData.emotions[0]?.type as any) || 'neutral',
                emotion_scores: emotionScores,
                input_method: 'voice',
                ai_processed_at: new Date().toISOString()
            })
            .select()
            .single();

        if (dbError) {
            console.error('Database error:', dbError);
            return NextResponse.json({ error: 'Failed to save entry' }, { status: 500 });
        }

        // 5. Cleanup Storage (Optional/Async)
        supabase.storage.from('audio_temp').remove([filePath]);

        return NextResponse.json({
            id: entryId,
            diary_text: aiData.diary_text,
            ai_response: aiData.ai_response,
            emotions: aiData.emotions
        });

    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
