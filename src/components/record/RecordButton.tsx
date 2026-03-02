'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Mic, Square } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RecordButtonProps {
    status: 'idle' | 'recording' | 'processing' | 'result';
    onClick: () => void;
}

export function RecordButton({ status, onClick }: RecordButtonProps) {
    const isRecording = status === 'recording';
    const isProcessing = status === 'processing';

    // Heartbeat animation for recording state
    const heartbeatVariants = {
        recording: {
            scale: [1, 1.08, 1],
        },
        idle: {
            scale: 1,
        },
    };

    // Breathing animation for idle state
    const breatheVariants = {
        idle: {
            boxShadow: [
                '0 0 0px rgba(168, 85, 247, 0)',
                '0 0 20px rgba(168, 85, 247, 0.4)',
                '0 0 0px rgba(168, 85, 247, 0)',
            ],
        },
    };

    return (
        <div className="relative flex items-center justify-center">
            {/* Background Glow */}
            <motion.div
                className="absolute inset-0 rounded-full bg-primary/20"
                animate={status === 'idle' ? 'idle' : ''}
                variants={breatheVariants}
                transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: "easeInOut",
                }}
            />

            <motion.button
                onClick={onClick}
                disabled={isProcessing}
                aria-label={isRecording ? '録音停止' : '録音開始'}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.92 }}
                variants={heartbeatVariants}
                animate={isRecording ? 'recording' : 'idle'}
                transition={isRecording ? {
                    scale: {
                        duration: 0.8,
                        repeat: Infinity,
                        ease: "easeInOut",
                    }
                } : {
                    type: 'spring',
                    stiffness: 260,
                    damping: 20,
                }}
                className={cn(
                    "relative z-10 w-20 h-20 rounded-full flex flex-col items-center justify-center gap-1 shadow-xl transition-colors duration-300",
                    isRecording
                        ? "bg-destructive border-4 border-destructive/30 text-white"
                        : "bg-primary text-primary-foreground"
                )}
            >
                {isRecording ? (
                    <>
                        <Square className="w-8 h-8 fill-current" />
                        <span className="text-[10px] font-bold tracking-wider">STOP</span>
                    </>
                ) : (
                    <>
                        <Mic className="w-8 h-8" />
                        <span className="text-[10px] font-bold tracking-wider">吐く</span>
                    </>
                )}

                {isProcessing && (
                    <div className="absolute inset-0 bg-background/80 rounded-full flex items-center justify-center">
                        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                )}
            </motion.button>
        </div>
    );
}
