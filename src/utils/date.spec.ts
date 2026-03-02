import { describe, it, expect } from 'vitest';
import { formatDate } from './date';

describe('formatDate', () => {
    it('should format date correctly in Japanese', () => {
        const date = new Date('2024-03-03T12:00:00');
        // 日曜日の場合
        expect(formatDate(date)).toBe('2024.03.03 (日)');
    });

    it('should handle string input', () => {
        expect(formatDate('2024-03-04T12:00:00')).toBe('2024.03.04 (月)');
    });

    it('should support custom format strings', () => {
        expect(formatDate('2024-03-03', 'yyyy/MM/dd')).toBe('2024/03/03');
    });
});
