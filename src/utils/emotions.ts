/**
 * 感情タイプに対応する絵文字を返します。
 */
export function getEmotionEmoji(type: string): string {
    const emojis: Record<string, string> = {
        joy: '😊',
        calm: '😌',
        sad: '😢',
        anger: '😤',
        anxiety: '😰',
        gratitude: '🙏'
    };
    return emojis[type] || '🤔';
}

/**
 * 読みやすい感情名（日本語）を返します。
 */
export function getEmotionLabel(type: string): string {
    const labels: Record<string, string> = {
        joy: '喜び',
        calm: '穏やか',
        sad: '悲しみ',
        anger: '怒り',
        anxiety: '不安',
        gratitude: '感謝'
    };
    return labels[type] || '不明';
}
