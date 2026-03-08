'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ChevronLeft, Bookmark } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatDate } from '@/utils/date';
import { getEmotionEmoji, getEmotionLabel } from '@/utils/emotions';
import { Typewriter } from '@/components/ui/Typewriter';

interface JournalEntryData {
    id: string;
    rewritten_diary: string | null;
    empathy_message: string | null;
    emotion_primary: string;
    emotion_scores: Record<string, number>;
    raw_transcript: string | null;
    created_at: string;
    input_method: string;
}

const fadeInUpVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: (i: number) => ({
        opacity: 1,
        y: 0,
        transition: {
            delay: i * 0.1,
            duration: 0.4,
            ease: [0.25, 0.1, 0.25, 1.0] as [number, number, number, number],
        },
    }),
};

export default function JournalDetailPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;

    const [entry, setEntry] = useState<JournalEntryData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchEntry() {
            const { data, error: fetchError } = await supabase
                .from('journal_entries')
                .select('*')
                .eq('id', id)
                .single();

            if (fetchError || !data) {
                setError('日記が見つかりませんでした');
            } else {
                setEntry(data as JournalEntryData);
            }
            setLoading(false);
        }
        if (id) fetchEntry();
    }, [id]);

    const emotions = entry?.emotion_scores
        ? Object.entries(entry.emotion_scores).map(([type, intensity]) => ({ type, intensity }))
        : [];

    if (loading) {
        return (
            <div className="min-h-screen bg-[#111111] text-foreground flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
            </div>
        );
    }

    if (error || !entry) {
        return (
            <div className="min-h-screen bg-[#111111] text-foreground flex flex-col items-center justify-center gap-4">
                <p className="text-muted-foreground">{error || 'エラーが発生しました'}</p>
                <button
                    onClick={() => router.push('/')}
                    className="px-6 py-2 bg-secondary hover:bg-secondary/80 rounded-full text-sm font-bold transition-all"
                >
                    ホームに戻る
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#111111] text-foreground flex flex-col font-sans selection:bg-primary/30">
            {/* Background Glow */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-20%] left-[50%] translate-x-[-50%] w-[120%] h-[60%] bg-primary/8 blur-[150px] rounded-full" />
            </div>

            {/* Header */}
            <header className="relative z-10 px-8 py-6 flex items-center justify-between">
                <button
                    onClick={() => router.push('/')}
                    className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors group"
                >
                    <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                    <span className="text-sm font-medium">ホーム</span>
                </button>
                <div className="text-xs text-muted-foreground font-medium uppercase tracking-[0.2em]">
                    {formatDate(entry.created_at, 'yyyy.MM.dd (eee) HH:mm')}
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 relative z-10 flex flex-col items-center px-[5%] md:px-[15%] pb-20 pt-4">
                <div className="w-full max-w-2xl space-y-8">
                    {/* AI Response Card */}
                    <motion.div
                        variants={fadeInUpVariants}
                        initial="hidden"
                        animate="visible"
                        custom={0}
                        className="glass-primary rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden"
                    >
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-2 h-2 bg-primary rounded-full animate-pulse shadow-[0_0_10px_rgba(168,85,247,0.8)]" />
                            <span className="text-sm font-bold text-primary/80 uppercase tracking-[0.3em]">Haku</span>
                        </div>
                        <div className="text-xl md:text-2xl leading-[2] font-medium text-foreground-body italic min-h-[4em]">
                            「<Typewriter text={entry.empathy_message || ''} delay={300} />」
                        </div>
                    </motion.div>

                    {/* Diary Text */}
                    <motion.div
                        variants={fadeInUpVariants}
                        initial="hidden"
                        animate="visible"
                        custom={1}
                        className="space-y-4"
                    >
                        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-[0.4em] ml-2">リライト日記</h3>
                        <div className="glass rounded-[2.5rem] p-10 shadow-xl">
                            <p className="leading-[1.8] text-foreground-body whitespace-pre-wrap text-lg">
                                {entry.rewritten_diary}
                            </p>

                            {/* Emotion Tags */}
                            <div className="flex flex-wrap gap-4 mt-12">
                                {emotions.map((emo, idx) => (
                                    <motion.div
                                        key={idx}
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{
                                            delay: 0.8 + idx * 0.15,
                                            type: 'spring',
                                            stiffness: 80,
                                            damping: 10,
                                        }}
                                        className="flex items-center gap-2 px-4 py-1.5 rounded-full border border-border bg-background/50 text-xs font-medium"
                                    >
                                        <span>{getEmotionEmoji(emo.type)}</span>
                                        <span>{getEmotionLabel(emo.type)}</span>
                                        <span className="opacity-40">{Math.round(emo.intensity * 100)}%</span>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    </motion.div>

                    {/* Actions */}
                    <motion.div
                        variants={fadeInUpVariants}
                        initial="hidden"
                        animate="visible"
                        custom={2}
                        className="flex justify-center pt-4"
                    >
                        <button
                            onClick={() => router.push('/')}
                            className="px-8 py-3 bg-secondary hover:bg-secondary/80 rounded-full text-sm font-bold transition-all"
                        >
                            ホームに戻る
                        </button>
                    </motion.div>
                </div>
            </main>
        </div>
    );
}
