import { GoogleGenerativeAI } from '@google/generative-ai';
import { HAKU_SYSTEM_PROMPT } from './ai/prompts';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

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
    const model = genAI.getGenerativeModel({
        model: "gemini-1.5-flash",
        generationConfig: {
            responseMimeType: "application/json",
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
    const responseText = result.response.text();
    return JSON.parse(responseText) as AIAnalysisResult;
}
