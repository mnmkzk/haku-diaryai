import { describe, it, expect } from 'vitest';
import { cn } from './utils';

describe('cn utility', () => {
    it('should merge tailwind classes correctly', () => {
        expect(cn('px-2 py-2', 'px-4')).toBe('py-2 px-4');
    });

    it('should handle conditional classes', () => {
        expect(cn('base', true && 'is-true', false && 'is-false')).toBe('base is-true');
    });

    it('should handle undefined and null', () => {
        expect(cn('base', undefined, null)).toBe('base');
    });
});
