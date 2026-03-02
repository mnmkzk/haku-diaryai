'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Settings, Calendar, Heart, MessageCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

export default function HomePage() {
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchEntries() {
      const { data, error } = await supabase
        .from('journal_entries')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        setEntries(data);
      }
      setLoading(false);
    }
    fetchEntries();
  }, []);

  const getEmotionEmoji = (type: string) => {
    const emojis: Record<string, string> = {
      joy: '😊', calm: '😌', sad: '😢', anger: '😤', anxiety: '😰', gratitude: '🙏'
    };
    return emojis[type] || '🤔';
  };

  return (
    <div className="min-h-screen bg-[#111111] text-foreground flex flex-col font-sans selection:bg-primary/30 pb-24">
      {/* Background Glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[50%] translate-x-[-50%] w-[100%] h-[40%] bg-primary/5 blur-[120px] rounded-full" />
      </div>

      {/* Header */}
      <header className="relative z-10 px-6 py-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Haku</h1>
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-[0.2em] mt-1 italic">Chill Buddy</p>
        </div>
        <button className="w-10 h-10 rounded-full glass flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
          <Settings className="w-5 h-5" />
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 relative z-10 px-6 max-w-2xl mx-auto w-full">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
          </div>
        ) : entries.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-32 text-center px-4"
          >
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-8 border border-primary/20">
              <Heart className="w-10 h-10 text-primary animate-pulse" />
            </div>
            <h2 className="text-2xl font-bold mb-4 tracking-tight">今日はどんな一日だった？</h2>
            <p className="text-muted-foreground leading-relaxed max-w-[280px]">
              誰にも言えないこと、嬉しかったこと、<br />
              Haku に聴かせて。
            </p>
          </motion.div>
        ) : (
          <div className="space-y-6 pt-4">
            {entries.map((entry, idx) => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="glass rounded-[2rem] p-6 space-y-4 hover:border-primary/30 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                    <Calendar className="w-3 h-3" />
                    {format(new Date(entry.created_at), 'yyyy.MM.dd (eee)', { locale: ja })}
                  </div>
                  <div className="text-xl">
                    {getEmotionEmoji(entry.emotion_primary)}
                  </div>
                </div>

                <p className="text-foreground-body line-clamp-3 leading-relaxed">
                  {entry.rewritten_diary}
                </p>

                <div className="pt-2 flex items-center gap-2">
                  <div className="flex -space-x-2">
                    {entry.emotion_scores?.slice(0, 2).map((emo: any, i: number) => (
                      <div key={i} className="w-6 h-6 rounded-full glass border-background flex items-center justify-center text-[10px]">
                        {getEmotionEmoji(emo.type)}
                      </div>
                    ))}
                  </div>
                  <span className="text-[10px] font-bold text-primary/60 uppercase tracking-tighter ml-1">
                    {entry.emotion_primary}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </main>

      {/* Bottom Action Button */}
      <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-20">
        <Link href="/record">
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="w-16 h-16 bg-primary rounded-full shadow-[0_0_30px_rgba(168,85,247,0.5)] flex items-center justify-center text-white"
          >
            <Mic className="w-8 h-8" />
          </motion.div>
        </Link>
      </div>

      {/* Navigation Background Bar (Mobile Native look) */}
      <div className="fixed bottom-0 left-0 w-full h-32 bg-gradient-to-t from-[#111111] via-[#111111]/80 to-transparent pointer-events-none z-10" />
    </div>
  );
}
