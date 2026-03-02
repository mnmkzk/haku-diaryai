import { describe, it, expect, vi, beforeEach } from 'vitest';
import { analyzeJournalEntry } from './gemini';

vi.mock('@google/generative-ai', () => {
    const mockGenerateContent = vi.fn();
    const mockGetGenerativeModel = vi.fn().mockReturnValue({
        generateContent: mockGenerateContent,
    });

    // new GoogleGenerativeAI() に対応するため、function を使用
    const GoogleGenerativeAI = function () {
        return {
            getGenerativeModel: mockGetGenerativeModel,
        };
    };

    return {
        GoogleGenerativeAI,
    };
});

// モックを後から取得するためのヘルパー
import { GoogleGenerativeAI } from '@google/generative-ai';
const getMocks = () => {
    const instance = new (GoogleGenerativeAI as any)();
    const model = instance.getGenerativeModel();
    return {
        generateContent: model.generateContent
    };
};

describe('analyzeJournalEntry', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should correctly format response from Gemini API', async () => {
        const { generateContent } = getMocks();
        const mockResponse = {
            response: {
                text: () => JSON.stringify({
                    diary_text: '今日は楽しかった。',
                    ai_response: 'それは良かったね！',
                    emotions: [{ type: 'joy', intensity: 0.8 }]
                })
            }
        };
        (generateContent as any).mockResolvedValue(mockResponse);

        const result = await analyzeJournalEntry('テスト入力');

        expect(result.diary_text).toBe('今日は楽しかった。');
        expect(result.emotions[0].type).toBe('joy');
    });

    it('should handle empty input (edge case)', async () => {
        const { generateContent } = getMocks();
        (generateContent as any).mockResolvedValue({
            response: {
                text: () => JSON.stringify({
                    diary_text: '',
                    ai_response: '何か話したいことはある？',
                    emotions: []
                })
            }
        });

        const result = await analyzeJournalEntry('');
        expect(result.diary_text).toBe('');
    });

    it('should handle extremely long text', async () => {
        const { generateContent } = getMocks();
        const longText = 'あ'.repeat(5000);
        (generateContent as any).mockResolvedValue({
            response: {
                text: () => JSON.stringify({
                    diary_text: '長い話だったね。',
                    ai_response: '全部聞いたよ。',
                    emotions: [{ type: 'calm', intensity: 0.5 }]
                })
            }
        });

        const result = await analyzeJournalEntry(longText);
        expect(result.diary_text).toBe('長い話だったね。');
    });

    it('should handle special characters', async () => {
        const { generateContent } = getMocks();
        const specialChars = '!@#$%^&*()_+{}:"<>?|~`-=[]\\\';,./';
        (generateContent as any).mockResolvedValue({
            response: {
                text: () => JSON.stringify({
                    diary_text: '記号がいっぱいだね。',
                    ai_response: '不思議な感じ。',
                    emotions: [{ type: 'anxiety', intensity: 0.3 }]
                })
            }
        });

        const result = await analyzeJournalEntry(specialChars);
        expect(result.diary_text).toBe('記号がいっぱいだね。');
    });
});
