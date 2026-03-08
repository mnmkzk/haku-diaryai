'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Edit, Send } from 'lucide-react';
import { WaveformVisualizer } from '@/components/record/WaveformVisualizer';
import { RecordButton } from '@/components/record/RecordButton';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';

const MAX_DURATION = 180; // 3分（設計書仕様）

export default function RecordPage() {
    const router = useRouter();
    const { analyserNode, isRecording, startRecording, stopRecording } = useAudioRecorder();

    const [status, setStatus] = useState<'idle' | 'recording' | 'processing'>('idle');
    const [timer, setTimer] = useState(0);
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const [textMode, setTextMode] = useState(false);
    const [textInput, setTextInput] = useState('');
    const autoStopRef = useRef(false);

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
            setToastMessage(null);
        }
    }, [isRecording]);

    // Timer logic + 3分上限
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (status === 'recording') {
            interval = setInterval(() => {
                setTimer((prev) => {
                    const next = prev + 1;
                    if (next >= MAX_DURATION && !autoStopRef.current) {
                        autoStopRef.current = true;
                        // 自動停止
                        handleAutoStop();
                    }
                    return next;
                });
            }, 1000);
        } else {
            setTimer(0);
            autoStopRef.current = false;
        }
        return () => clearInterval(interval);
    }, [status]);

    // Toast自動消去（3秒後）
    useEffect(() => {
        if (toastMessage) {
            const timeout = setTimeout(() => setToastMessage(null), 3000);
            return () => clearTimeout(timeout);
        }
    }, [toastMessage]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const showError = (message: string) => {
        setToastMessage(message);
        setStatus('idle');
    };

    const handleAutoStop = async () => {
        try {
            const audioBlob = await stopRecording();
            await processAudio(audioBlob);
        } catch (err) {
            console.error("Error in auto stop:", err);
            showError('処理中にエラーが発生しました。もう一度お試しください。');
        }
    };

    const processAudio = async (audioBlob: Blob) => {
        setStatus('processing');

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
        // 設計書仕様: Processing → JournalDetail へ遷移
        router.push(`/journal/${data.id}`);
    };

    const handleRecordToggle = async () => {
        if (status === 'idle') {
            try {
                await startRecording();
            } catch (err) {
                console.error("Failed to start recording", err);
                showError('マイクが使えないみたい。設定を見てみてくれる？');
            }
        } else if (status === 'recording') {
            try {
                const audioBlob = await stopRecording();
                await processAudio(audioBlob);
            } catch (err) {
                console.error("Error processing recording:", err);
                showError('処理中にエラーが発生しました。もう一度お試しください。');
            }
        }
    };

    const handleTextSubmit = async () => {
        if (!textInput.trim()) return;

        try {
            setStatus('processing');

            const formData = new FormData();
            formData.append('text', textInput.trim());

            const response = await fetch('/api/entries', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                throw new Error('Failed to process text');
            }

            const data = await response.json();
            router.push(`/journal/${data.id}`);
        } catch (err) {
            console.error("Error processing text:", err);
            showError('処理中にエラーが発生しました。もう一度お試しください。');
        }
    };

    const isWarning = status === 'recording' && timer >= MAX_DURATION - 30;

    return (
        <div className="min-h-screen bg-[#111111] text-foreground flex flex-col font-sans selection:bg-primary/30 overflow-x-hidden">
            {/* Background Glow */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-20%] left-[50%] translate-x-[-50%] w-[120%] h-[60%] bg-primary/10 blur-[150px] rounded-full" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-900/10 blur-[120px] rounded-full" />
            </div>

            {/* Toast Error (設計書仕様: Toast で短くエラー表示し idle に復帰) */}
            <AnimatePresence>
                {toastMessage && (
                    <motion.div
                        initial={{ opacity: 0, y: -40 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -40 }}
                        className="fixed top-6 left-1/2 -translate-x-1/2 z-50 glass border-destructive/30 px-6 py-3 rounded-2xl flex items-center gap-3 text-destructive shadow-lg"
                    >
                        <span className="text-sm font-medium">{toastMessage}</span>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Header */}
            <header className="relative z-10 px-8 py-6 flex items-center justify-between">
                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors group"
                >
                    <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                    <span className="text-sm font-medium">戻る</span>
                </button>
            </header>

            {/* Main Content */}
            <main className="flex-1 relative z-10 flex flex-col items-center justify-center px-[5%] md:px-[15%] pb-20">
                <AnimatePresence mode="wait">
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
                    ) : textMode ? (
                        <motion.div
                            key="text-input"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="w-full max-w-2xl flex flex-col items-center gap-8"
                        >
                            <div className="text-center space-y-2">
                                <h2 className="text-xl font-bold tracking-tight">今日はどんな一日だった？</h2>
                                <p className="text-sm text-muted-foreground">思ったこと、感じたこと、なんでも書いてみて</p>
                            </div>

                            <div className="w-full">
                                <textarea
                                    value={textInput}
                                    onChange={(e) => setTextInput(e.target.value)}
                                    placeholder="今日あったことを書いてみて..."
                                    className="w-full h-48 bg-card/30 backdrop-blur-md rounded-3xl border border-border/50 shadow-2xl p-6 text-foreground-body placeholder:text-muted-foreground/50 resize-none focus:outline-none focus:border-primary/50 transition-colors"
                                />
                            </div>

                            <div className="flex flex-col items-center gap-4">
                                <button
                                    onClick={handleTextSubmit}
                                    disabled={!textInput.trim()}
                                    className="flex items-center gap-2 px-8 py-3 bg-primary hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed rounded-full text-sm font-bold text-primary-foreground transition-all"
                                >
                                    <Send className="w-4 h-4" />
                                    <span>送信する</span>
                                </button>

                                <button
                                    className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors text-sm font-medium"
                                    onClick={() => setTextMode(false)}
                                >
                                    <span>音声で入力する</span>
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
                                <div className={`text-6xl font-bold tracking-widest font-mono tabular-nums ${isWarning ? 'text-destructive' : ''}`}>
                                    {formatTime(timer)}
                                </div>
                                <div className="text-sm text-muted-foreground font-medium uppercase tracking-[0.2em]">
                                    {status === 'recording'
                                        ? (isWarning ? `残り ${MAX_DURATION - timer}秒` : 'Recording')
                                        : 'Ready to listen'}
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
                                    onClick={() => setTextMode(true)}
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
