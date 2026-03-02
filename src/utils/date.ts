import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

/**
 * 日付を指定されたフォーマット（デフォルト: yyyy.MM.dd (eee)）で整形します。
 */
export function formatDate(date: Date | string | number, formatStr: string = 'yyyy.MM.dd (eee)'): string {
    const d = new Date(date);
    return format(d, formatStr, { locale: ja });
}
