import { GoogleGenerativeAI } from '@google/generative-ai';
import { HAKU_SYSTEM_PROMPT, RESPONSE_SCHEMA } from './ai/prompts';

const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY || '';
// API バージョンを明示的に指定（v1 を優先）
const genAI = new GoogleGenerativeAI(apiKey);

export interface AIAnalysisResult {
    diary_text: string;
    ai_response: string;
    emotions: Array<{
        type: "joy" | "calm" | "sad" | "anger" | "anxiety" | "gratitude" | "surprise" | "neutral";
        intensity: number;
    }>;
}

/**
 * ユーザーの音声入力（またはテキスト）を Gemini API を使用して解析し、
 * 日記形式のリライト、AIのレスポンス、感情分析結果を返します。
 */
export async function analyzeJournalEntry(
    data: Buffer | string,
    mimeType: string = "audio/webm"
): Promise<AIAnalysisResult> {
    if (!apiKey) {
        throw new Error('Gemini API API key is not configured. Please set GEMINI_API_KEY in Vercel environment variables.');
    }

    // デバッグ用: キーのソースと形式を確認
    const keySource = process.env.GEMINI_API_KEY ? 'GEMINI_API_KEY' : (process.env.GOOGLE_GENERATIVE_AI_API_KEY ? 'GOOGLE_GENERATIVE_AI_API_KEY' : 'NONE');
    const maskedKey = apiKey ? `${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}` : 'missing';
    console.log(`[Gemini Auth] Source: ${keySource}, Key: ${maskedKey}, Model: gemini-1.5-flash, API Version: v1 (default)`);

    try {
        const model = genAI.getGenerativeModel({
            model: "gemini-1.5-flash",
            // responseSchema を使用すると SDK は内部的に v1beta を使用する。
            // 404 が続く場合はここを null にして手動パースに切り替える必要がある。
            generationConfig: {
                temperature: 0.7,
            }
        }, { apiVersion: 'v1' });

        let promptContent: any[];

        const jsonInstruction = `
必ず以下のJSON形式のみを出力してください。他の説明文は一切含めないでください。
{
  "diary_text": "一人称の日記形式のリライト",
  "ai_response": "200〜300文字の温かい共感的レスポンス",
  "emotions": [
    { "type": "joy|calm|sad|anger|anxiety|gratitude|surprise|neutral", "intensity": 0.1〜1.0 }
  ]
}`;

        if (typeof data === 'string') {
            promptContent = [
                HAKU_SYSTEM_PROMPT,
                data,
                jsonInstruction
            ];
        } else {
            promptContent = [
                HAKU_SYSTEM_PROMPT,
                {
                    inlineData: {
                        mimeType,
                        data: data.toString("base64")
                    }
                },
                jsonInstruction
            ];
        }

        const result = await model.generateContent(promptContent);
        const response = await result.response;
        let responseText = response.text();

        console.log('[Gemini Response Raw]:', responseText);

        // JSONブロックを抽出する正規表現
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('Failed to extract JSON from Gemini response');
        }

        const jsonString = jsonMatch[0];
        return JSON.parse(jsonString) as AIAnalysisResult;
    } catch (error: any) {
        console.error('Gemini Analysis Error:', error);
        throw new Error(`AI Analysis failed: ${error.message}`);
    }
}
