'use client'

import { supabase } from '@/lib/supabase'
import { motion } from 'framer-motion'
import { Heart } from 'lucide-react'

export default function LoginPage() {
    const handleGoogleLogin = async () => {
        // Check if supabase is initialized correctly
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/auth/callback`,
            },
        })
        if (error) {
            console.error('Login error:', error.message)
        }
    }

    return (
        <div className="min-h-screen bg-[#111111] text-foreground flex flex-col items-center justify-center p-6 font-sans">
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-10%] left-[50%] translate-x-[-50%] w-[100%] h-[40%] bg-primary/10 blur-[120px] rounded-full" />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass rounded-[2.5rem] p-12 max-w-md w-full text-center space-y-8 relative z-10"
            >
                <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto border border-primary/20">
                    <Heart className="w-10 h-10 text-primary" />
                </div>
                <div className="space-y-2">
                    <h1 className="text-3xl font-bold tracking-tight">Haku</h1>
                    <p className="text-muted-foreground leading-relaxed">
                        親友 Haku があなたの物語を待っています。<br />
                        Googleアカウントでログインして始めましょう。
                    </p>
                </div>

                <button
                    onClick={handleGoogleLogin}
                    className="w-full py-4 bg-white text-black hover:bg-gray-100 rounded-full font-bold flex items-center justify-center gap-3 transition-all"
                >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path
                            fill="currentColor"
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                            fill="currentColor"
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                            fill="currentColor"
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.27.81-.57z"
                        />
                        <path
                            fill="currentColor"
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        />
                    </svg>
                    Googleでログイン
                </button>
            </motion.div>
        </div>
    )
}
