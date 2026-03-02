import { describe, it, expect } from 'vitest';
import { getEmotionEmoji, getEmotionLabel } from './emotions';

describe('emotions utility', () => {
    describe('getEmotionEmoji', () => {
        it('should return correct emoji for known types', () => {
            expect(getEmotionEmoji('joy')).toBe('😊');
            expect(getEmotionEmoji('sad')).toBe('😢');
        });

        it('should return default emoji for unknown types', () => {
            expect(getEmotionEmoji('unknown')).toBe('🤔');
        });
    });

    describe('getEmotionLabel', () => {
        it('should return correct label for known types', () => {
            expect(getEmotionLabel('joy')).toBe('喜び');
            expect(getEmotionLabel('anxiety')).toBe('不安');
        });

        it('should return default label for unknown types', () => {
            expect(getEmotionLabel('unknown')).toBe('不明');
        });
    });
});
