"use client"

import React, { useEffect, useRef } from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface AudioVisualizerProps {
    analyserNode: AnalyserNode | null
    isActive: boolean
    className?: string
}

export function AudioVisualizer({ analyserNode, isActive, className }: AudioVisualizerProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const animationRef = useRef<number>()

    useEffect(() => {
        if (!canvasRef.current || !analyserNode || !isActive) {
            if (!isActive && canvasRef.current) {
                // Clear canvas when inactive
                const ctx = canvasRef.current.getContext("2d")
                if (ctx) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
            }
            return
        }

        const canvas = canvasRef.current
        const ctx = canvas.getContext("2d")
        if (!ctx) return

        // Setup high DPI canvas
        const dpr = window.devicePixelRatio || 1
        const rect = canvas.getBoundingClientRect()
        canvas.width = rect.width * dpr
        canvas.height = rect.height * dpr
        ctx.scale(dpr, dpr)

        const bufferLength = analyserNode.frequencyBinCount
        const dataArray = new Uint8Array(bufferLength)

        // We only need a subset for the visualizer, e.g. 64 bars
        const barCount = 64
        const barWidth = (rect.width - (barCount - 1) * 2) / barCount
        const centerY = rect.height / 2
        const maxBarHeight = centerY - 10

        let bars = new Array(barCount).fill(0)

        const draw = () => {
            animationRef.current = requestAnimationFrame(draw)
            analyserNode.getByteFrequencyData(dataArray)

            ctx.clearRect(0, 0, rect.width, rect.height)

            // Downsample frequency data to barCount
            const step = Math.floor(bufferLength / barCount)

            for (let i = 0; i < barCount; i++) {
                const dataIndex = i * step
                let value = dataArray[dataIndex] || 0

                // Normalize value (0-255) to height
                const target = (value / 255) * maxBarHeight
                // Smooth transition (lerp)
                bars[i] += (target - bars[i]) * 0.15

                const h = Math.max(2, bars[i])
                const x = i * (barWidth + 2)

                // Alpha gradient from center
                const distFromCenter = Math.abs(i - barCount / 2) / (barCount / 2)
                const alpha = 1 - distFromCenter * 0.5

                const gradient = ctx.createLinearGradient(x, centerY - h, x, centerY + h)
                // Primary colors (hsl(var(--primary)) and hsl(var(--primary-bright)))
                gradient.addColorStop(0, `hsla(265, 90%, 72%, ${alpha})`)
                gradient.addColorStop(0.5, `hsla(270, 95%, 80%, ${alpha})`)
                gradient.addColorStop(1, `hsla(265, 85%, 68%, ${alpha * 0.5})`)

                ctx.fillStyle = gradient
                ctx.beginPath()
                ctx.roundRect(x, centerY - h, barWidth, h * 2, 2)
                ctx.fill()
            }
        }

        draw()

        return () => {
            if (animationRef.current) cancelAnimationFrame(animationRef.current)
        }
    }, [analyserNode, isActive])

    return (
        <motion.div
            className={cn("w-full h-full relative", className)}
            initial={{ opacity: 0 }}
            animate={{ opacity: isActive ? 1 : 0 }}
            transition={{ duration: 0.3 }}
        >
            <canvas
                ref={canvasRef}
                className="w-full h-full block"
                style={{ filter: "drop-shadow(0 0 12px hsl(var(--primary) / 0.4))" }}
            />
        </motion.div>
    )
}
