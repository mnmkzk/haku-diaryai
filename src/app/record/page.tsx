'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Edit } from 'lucide-react';
import { WaveformVisualizer } from '@/components/record/WaveformVisualizer';
import { RecordButton } from '@/components/record/RecordButton';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { Typewriter } from '@/components/ui/Typewriter';

export default function RecordPage() {
    const router = useRouter();
    const { analyserNode, isRecording, startRecording, stopRecording } = useAudioRecorder();

    const [status, setStatus] = useState<'idle' | 'recording' | 'processing' | 'result'>('idle');
    const [timer, setTimer] = useState(0);
    const [errorVisible, setErrorVisible] = useState(false);
    const [result, setResult] = useState<{
        diary_text: string;
        ai_response: string;
        emotions: { type: string; intensity: number }[];
    } | null>(null);

    // Beforeunload protection
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (status === 'processing') {
                e.preventDefault();
                e.returnValue = '';
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [status]);

    // Sync status with isRecording
    useEffect(() => {
        if (isRecording) {
            setStatus('recording');
            setErrorVisible(false);
        } else if (status === 'recording') {
            // Transition from recording to processing
            setStatus('processing');
        }
    }, [isRecording]);

    // Timer logic
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (status === 'recording') {
            interval = setInterval(() => {
                setTimer((prev) => prev + 1);
            }, 1000);
        } else {
            setTimer(0);
        }
        return () => clearInterval(interval);
    }, [status]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const handleRecordToggle = async () => {
        if (status === 'idle') {
            try {
                await startRecording();
            } catch (err) {
                console.error("Failed to start recording", err);
                setErrorVisible(true);
                setStatus('idle');
            }
        } else if (status === 'recording') {
            try {
                const audioBlob = await stopRecording();
                setStatus('processing');

                // Send to backend
                const formData = new FormData();
                formData.append('audio', audioBlob, 'record.webm');

                const response = await fetch('/api/entries', {
                    method: 'POST',
                    body: formData,
                });

                if (!response.ok) {
                    throw new Error('Failed to process AI analysis');
                }

                const data = await response.json();
                setResult(data);
                setStatus('result');

            } catch (err) {
                console.error("Error processing recording:", err);
                setStatus('idle');
            }
        }
    };

    const getEmotionEmoji = (type: string) => {
        const emojis: Record<string, string> = {
            joy: '😊', calm: '😌', sad: '😢', anger: '😤', anxiety: '😰', gratitude: '🙏'
        };
        return emojis[type] || '🤔';
    };

    return (
        <div className="min-h-screen bg-[#111111] text-foreground flex flex-col font-sans selection:bg-primary/30 overflow-x-hidden">
            {/* Background Glow */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-20%] left-[50%] translate-x-[-50%] w-[120%] h-[60%] bg-primary/10 blur-[150px] rounded-full" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-900/10 blur-[120px] rounded-full" />
            </div>

            {/* Header */}
            <header className="relative z-10 px-8 py-6 flex items-center justify-between">
                <button
                    onClick={() => status === 'result' ? setStatus('idle') : router.back()}
                    className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors group"
                >
                    <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                    <span className="text-sm font-medium">戻る</span>
                </button>
            </header>

            {/* Main Content */}
            <main className="flex-1 relative z-10 flex flex-col items-center justify-center px-[5%] md:px-[15%] pb-20">
                <AnimatePresence mode="wait">
                    {errorVisible && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="glass border-destructive/30 px-6 py-3 rounded-2xl mb-8 flex items-center gap-3 text-destructive"
                        >
                            <span className="text-sm font-medium">あ、マイクが使えないみたい。設定を見てみてくれる？</span>
                        </motion.div>
                    )}

                    {status === 'processing' ? (
                        <motion.div
                            key="processing"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="text-center space-y-6"
                        >
                            <div className="relative w-24 h-24 mx-auto">
                                <div className="absolute inset-0 border-4 border-primary/10 rounded-full" />
                                <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                            </div>
                            <div className="space-y-2">
                                <h2 className="text-xl font-bold tracking-tight">Haku が聴いています...</h2>
                                <p className="text-muted-foreground animate-pulse">あなたの言葉を大切に整理しているよ</p>
                            </div>
                        </motion.div>
                    ) : status === 'result' && result ? (
                        <motion.div
                            key="result"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="w-full max-w-2xl space-y-8"
                        >
                            {/* AI Response Card */}
                            <div className="glass-primary rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden group">
                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-2 h-2 bg-primary rounded-full animate-pulse shadow-[0_0_10px_rgba(168,85,247,0.8)]" />
                                    <span className="text-sm font-bold text-primary/80 uppercase tracking-[0.3em]">Haku</span>
                                </div>
                                <div className="text-xl md:text-2xl leading-[2] font-medium text-foreground-body italic min-h-[4em]">
                                    「<Typewriter text={result.ai_response} delay={500} />」
                                </div>
                            </div>

                            {/* Diary Text Card */}
                            <div className="space-y-4">
                                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-[0.4em] ml-2">リライト日記</h3>
                                <div className="glass rounded-[2.5rem] p-10 shadow-xl">
                                    <p className="leading-[1.8] text-foreground-body whitespace-pre-wrap text-lg">
                                        {result.diary_text}
                                    </p>

                                    <div className="flex flex-wrap gap-4 mt-12">
                                        {result.emotions.map((emo, idx) => (
                                            <div
                                                key={idx}
                                                className="flex items-center gap-2 px-4 py-1.5 rounded-full border border-border bg-background/50 text-xs font-medium"
                                            >
                                                <span>{getEmotionEmoji(emo.type)}</span>
                                                <span>{emo.type}</span>
                                                <span className="opacity-40">{Math.round(emo.intensity * 100)}%</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-center pt-4">
                                <button
                                    onClick={() => setStatus('idle')}
                                    className="px-8 py-3 bg-secondary hover:bg-secondary/80 rounded-full text-sm font-bold transition-all"
                                >
                                    もう一度話す
                                </button>
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="recording-ui"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="w-full max-w-2xl flex flex-col items-center gap-12"
                        >
                            <div className="text-center space-y-4">
                                <div className="text-6xl font-bold tracking-widest font-mono tabular-nums">
                                    {formatTime(timer)}
                                </div>
                                <div className="text-sm text-muted-foreground font-medium uppercase tracking-[0.2em]">
                                    {status === 'recording' ? 'Recording' : 'Ready to listen'}
                                </div>
                            </div>

                            {/* Waveform Area with Card Style */}
                            <div className="w-full h-48 bg-card/30 backdrop-blur-md rounded-3xl border border-border/50 shadow-2xl overflow-hidden p-8 flex items-center justify-center">
                                <WaveformVisualizer analyserNode={analyserNode} isActive={isRecording} />
                            </div>

                            <div className="flex flex-col items-center gap-8">
                                <RecordButton status={status} onClick={handleRecordToggle} />

                                <button
                                    className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors text-sm font-medium"
                                    onClick={() => {/* Navigate to text input */ }}
                                >
                                    <Edit className="w-4 h-4" />
                                    <span>テキストで入力する</span>
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>

            <footer className="relative z-10 p-12 text-center">
                <p className="text-xs text-muted-foreground/50 leading-[1.8]">
                    吐き出した言葉は、AIが大切に預かります。<br />
                    安心してお話しください。
                </p>
            </footer>
        </div>
    );
}
