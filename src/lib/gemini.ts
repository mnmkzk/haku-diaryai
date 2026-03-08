import { GoogleGenerativeAI } from '@google/generative-ai';
import { HAKU_SYSTEM_PROMPT, RESPONSE_SCHEMA } from './ai/prompts';

const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY || '';
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
        throw new Error('Gemini API API key is not configured. Please set GOOGLE_GENERATIVE_AI_API_KEY in environment variables.');
    }

    try {
        const model = genAI.getGenerativeModel({
            model: "gemini-1.5-flash",
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: RESPONSE_SCHEMA as any,
            }
        });

        let promptContent: any[];

        if (typeof data === 'string') {
            promptContent = [
                HAKU_SYSTEM_PROMPT,
                data,
                "JSON形式で出力してください。"
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
                "JSON形式で出力してください。"
            ];
        }

        const result = await model.generateContent(promptContent);
        const response = await result.response;
        let responseText = response.text();

        // 稀に Markdown のコードブロック文字が含まれる場合の対策
        responseText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();

        return JSON.parse(responseText) as AIAnalysisResult;
    } catch (error: any) {
        console.error('Gemini Analysis Error:', error);
        throw new Error(`AI Analysis failed: ${error.message}`);
    }
}
