'use client'

import { motion } from 'framer-motion'
import { AlertTriangle } from 'lucide-react'
import Link from 'next/link'

export default function AuthCodeErrorPage() {
    return (
        <div className="min-h-screen bg-[#111111] text-foreground flex flex-col items-center justify-center p-6 font-sans">
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-10%] left-[50%] translate-x-[-50%] w-[100%] h-[40%] bg-red-500/5 blur-[120px] rounded-full" />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass rounded-[2.5rem] p-12 max-w-md w-full text-center space-y-8 relative z-10"
            >
                <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto border border-red-500/20">
                    <AlertTriangle className="w-10 h-10 text-red-400" />
                </div>
                <div className="space-y-2">
                    <h1 className="text-2xl font-bold tracking-tight">認証エラー</h1>
                    <p className="text-muted-foreground leading-relaxed">
                        ログインに失敗しました。<br />
                        もう一度お試しください。
                    </p>
                </div>

                <Link
                    href="/login"
                    className="inline-block w-full py-4 bg-white text-black hover:bg-gray-100 rounded-full font-bold transition-all text-center"
                >
                    ログインに戻る
                </Link>
            </motion.div>
        </div>
    )
}
