import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { HAKU_SYSTEM_PROMPT, RESPONSE_SCHEMA } from '@/lib/ai/prompts';
import { v4 as uuidv4 } from 'uuid';

// Vercel timeout setting
export const maxDuration = 60;

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: Request) {
    try {
        const formData = await req.formData();
        const audioFile = formData.get('audio') as Blob;

        if (!audioFile) {
            return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
        }

        // 1. Get user session (mocking user_id for now as auth is not yet implemented)
        // In real implementation: const { data: { user } } = await supabase.auth.getUser();
        const userId = '00000000-0000-0000-0000-000000000000';
        const entryId = uuidv4();

        // 2. Upload to Supabase Storage (audio_temp)
        const filePath = `${userId}/${entryId}.webm`;
        const { error: uploadError } = await supabase.storage
            .from('audio_temp')
            .upload(filePath, audioFile);

        if (uploadError) {
            console.error('Upload error:', uploadError);
            // If bucket doesn't exist, we might proceed with direct analysis if possible
        }

        // 3. Transcription & Analysis using Gemini 1.5 Flash
        // Note: Gemini 1.5 Flash can handle audio directly
        const model = genAI.getGenerativeModel({
            model: "gemini-1.5-flash",
            generationConfig: {
                responseMimeType: "application/json",
            }
        });

        const audioBuffer = Buffer.from(await audioFile.arrayBuffer());

        const result = await model.generateContent([
            HAKU_SYSTEM_PROMPT,
            {
                inlineData: {
                    mimeType: audioFile.type || "audio/webm",
                    data: audioBuffer.toString("base64")
                }
            },
            "JSON形式で出力してください。"
        ]);

        const responseText = result.response.text();
        const aiData = JSON.parse(responseText);

        // 4. Save to Database
        const { data: entry, error: dbError } = await supabase
            .from('journal_entries')
            .insert({
                id: entryId,
                user_id: userId,
                raw_transcript: aiData.diary_text, // Simplified for now
                rewritten_diary: aiData.diary_text,
                empathy_message: aiData.ai_response,
                emotion_primary: aiData.emotions[0]?.type || 'neutral',
                emotion_scores: aiData.emotions,
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
