'use client';

import React, { useEffect, useRef } from 'react';

interface WaveformVisualizerProps {
    analyserNode: AnalyserNode | null;
    isActive: boolean;
    color?: string;
}

export function WaveformVisualizer({
    analyserNode,
    isActive,
    color = 'hsl(265, 90%, 72%)',
}: WaveformVisualizerProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationRef = useRef<number | null>(null);

    useEffect(() => {
        if (!canvasRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const bufferLength = analyserNode?.frequencyBinCount || 64;
        const dataArray = new Uint8Array(bufferLength);

        const draw = () => {
            animationRef.current = requestAnimationFrame(draw);

            const width = canvas.width;
            const height = canvas.height;

            ctx.clearRect(0, 0, width, height);

            if (analyserNode && isActive) {
                analyserNode.getByteFrequencyData(dataArray);
            } else {
                // Simple breathing effect when not active/no data
                const time = Date.now() / 1000;
                for (let i = 0; i < bufferLength; i++) {
                    dataArray[i] = 10 + Math.sin(time * 2 + i * 0.1) * 5;
                }
            }

            const barWidth = (width / bufferLength) * 2.5;
            let barHeight;
            let x = 0;

            for (let i = 0; i < bufferLength; i++) {
                barHeight = (dataArray[i] / 255) * height;

                // Apply gradient from primary to primary-bright
                const gradient = ctx.createLinearGradient(0, height, 0, height - barHeight);
                gradient.addColorStop(0, color);
                gradient.addColorStop(1, 'hsl(270, 95%, 78%)');

                ctx.fillStyle = gradient;

                // Rounded bars logic
                const radius = barWidth / 2;
                const rectX = x;
                const rectY = height - barHeight;
                const rectWidth = barWidth - 2;
                const rectHeight = barHeight;

                if (rectHeight > 2) {
                    ctx.beginPath();
                    ctx.roundRect(rectX, rectY, rectWidth, rectHeight, [radius, radius, 0, 0]);
                    ctx.fill();
                } else {
                    // Minimum bar height
                    ctx.beginPath();
                    ctx.roundRect(rectX, height - 2, rectWidth, 2, [radius, radius, 0, 0]);
                    ctx.fill();
                }

                x += barWidth + 1;
            }
        };

        draw();

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, [analyserNode, isActive, color]);

    return (
        <canvas
            ref={canvasRef}
            className="w-full h-full"
            width={600}
            height={200}
        />
    );
}
