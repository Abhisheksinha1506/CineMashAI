'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Minimize2, Clapperboard, X, Sparkles, Film } from 'lucide-react';
import { ChatMessage, FusionResult } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface RefinementChatProps {
  onSendMessage: (message: string) => void;
  messages: ChatMessage[];
  isMinimized?: boolean;
  onToggleMinimize?: () => void;
  fusionPreview?: FusionResult | null;
}

const QUICK_PROMPTS = [
  'Make it darker & more intense',
  'Add a comedic twist',
  'Change the lead actor',
  'Set it in space',
];

export function RefinementChat({
  onSendMessage,
  messages,
  isMinimized = false,
  onToggleMinimize,
  fusionPreview,
}: RefinementChatProps) {
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;
    onSendMessage(input.trim());
    setInput('');
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div
      className={cn(
        'fixed bottom-5 right-5 z-50 transition-all duration-500 ease-out',
        isMinimized ? 'w-14 h-14' : 'w-[380px] h-[580px]'
      )}
    >
      <AnimatePresence mode="wait">
        {isMinimized ? (
          <motion.button
            key="min"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            onClick={onToggleMinimize}
            className="w-full h-full rounded-full bg-[var(--primary)] text-[var(--background)] dark:text-black light:text-[var(--background)] flex items-center justify-center shadow-[0_0_25px_rgba(0,240,255,0.5)] dark:shadow-[0_0_25px_rgba(0,240,255,0.5)] light:shadow-[0_0_25px_rgba(0,212,255,0.4)] hover:shadow-[0_0_35px_rgba(0,240,255,0.7)] transition-all focus-ring"
            aria-label="Open director's notes chat"
            aria-expanded="false"
            tabIndex={0}
            role="button"
          >
            <Clapperboard className="h-5 w-5" />
          </motion.button>
        ) : (
          <motion.div
            key="max"
            initial={{ y: 16, opacity: 0, scale: 0.97 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 16, opacity: 0, scale: 0.97 }}
            className="w-full h-full rounded-[1.75rem] overflow-hidden flex flex-col glass-strong dark:glass-strong light:bg-[var(--card)] light:border light:border-[var(--border)] light:shadow-[0_4px_24px_rgba(0,0,0,0.1)] border border-[#00f0ff]/12 dark:border-[#00f0ff]/12 light:border-[var(--primary)]/20 shadow-[0_0_50px_rgba(0,0,0,0.8),0_0_30px_rgba(0,240,255,0.05)]"
            role="dialog"
            aria-labelledby="chat-header"
            aria-describedby="chat-status"
          >
            {/* Header */}
            <div className="director-notes-header flex items-center justify-between px-5 py-4 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="h-8 w-8 rounded-xl bg-[var(--primary)]/10 border border-[var(--primary)]/20 flex items-center justify-center">
                    <Clapperboard className="h-4 w-4 text-[var(--primary)]" />
                  </div>
                  {/* Glowing status dot */}
                  <div className="glowing-status-dot absolute -top-0.5 -right-0.5" />
                </div>
                <div>
                  <h3 id="chat-header" className="text-[13px] font-black text-[var(--text)] dark:text-white uppercase tracking-tight">Director's Notes</h3>
                  <p id="chat-status" className="text-[10px] text-zinc-500 dark:text-zinc-500 light:text-zinc-600 font-medium flex items-center gap-1">
                    <span className="inline-block w-1.5 h-1.5 bg-[var(--primary)] rounded-full animate-pulse" />
                    Live with Groq
                  </p>
                </div>
              </div>
              <button
                onClick={onToggleMinimize}
                className="h-7 w-7 rounded-full bg-white/[0.04] hover:bg-white/[0.08] flex items-center justify-center text-zinc-500 hover:text-white transition-all focus-ring"
                aria-label="Minimize director's notes chat"
                aria-expanded="true"
                tabIndex={0}
              >
                <Minimize2 className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Messages */}
            <div 
              className="flex-1 overflow-y-auto custom-scrollbar px-4 py-4 space-y-4"
              role="log"
              aria-live="polite"
              aria-label="Chat conversation with AI director"
            >
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center gap-6 opacity-60">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-2xl bg-white/[0.03] dark:bg-white/[0.03] light:bg-[var(--card)]/50 border border-white/[0.06] dark:border-white/[0.06] light:border-[var(--border)] flex items-center justify-center">
                      <Clapperboard className="h-8 w-8 text-zinc-600 dark:text-zinc-600 light:text-zinc-500" />
                    </div>
                    {/* Floating particles */}
                    <div className="absolute -top-1 -left-1 w-1.5 h-1.5 bg-[var(--primary)]/50 rounded-full animate-pulse" />
                    <div className="absolute -top-2 -right-2 w-1 h-1 bg-[var(--secondary)]/50 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
                    <div className="absolute -bottom-1 left-2 w-1 h-1 bg-[#f5c842]/50 rounded-full animate-pulse" style={{ animationDelay: '0.8s' }} />
                  </div>
                  <div className="space-y-3">
                    <p className="text-[11px] font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-500 light:text-zinc-600">Director Awaits</p>
                    <p className="text-[10px] text-zinc-700 dark:text-zinc-700 light:text-zinc-600 font-medium max-w-[180px] mx-auto leading-relaxed">
                      Fuse 2–4 movies to begin your cinematic collaboration with AI
                    </p>
                    <div className="flex items-center justify-center gap-2 text-[9px] text-zinc-600 dark:text-zinc-600 light:text-zinc-500">
                      <span className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-[var(--primary)] rounded-full animate-pulse" />
                        Creative
                      </span>
                      <span className="w-px h-2 bg-zinc-700 dark:bg-zinc-700 light:bg-[var(--border)]" />
                      <span className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-[var(--secondary)] rounded-full animate-pulse" style={{ animationDelay: '0.3s' }} />
                        Intelligent
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {messages.map((msg, idx) => (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 8, x: msg.sender === 'user' ? 8 : -8 }}
                      animate={{ opacity: 1, y: 0, x: 0 }}
                      className={cn(
                        'flex flex-col gap-1',
                        msg.sender === 'user' ? 'items-end' : 'items-start'
                      )}
                      role="article"
                      aria-label={`${msg.sender === 'user' ? 'Your message' : 'Director AI response'}: ${msg.content.substring(0, 50)}...`}
                    >
                      {msg.sender === 'ai' && (
                        <div className="flex items-center gap-1.5 ml-1">
                          <div className="h-4 w-4 rounded bg-[#00f0ff]/10 border border-[#00f0ff]/20 flex items-center justify-center">
                            <Clapperboard className="h-2.5 w-2.5 text-[#00f0ff]" />
                          </div>
                          <span className="text-[9px] font-black uppercase tracking-widest text-[#00f0ff]/50">Director AI</span>
                        </div>
                      )}
                      
                      {/* Message bubble with premium styling */}
                      <div
                        className={cn(
                          'relative px-4 py-3 rounded-2xl max-w-[280px] break-words',
                          msg.sender === 'user'
                            ? 'bg-[var(--primary)] text-[var(--background)] dark:text-black light:text-[var(--background)]'
                            : 'bg-white/[0.05] dark:bg-white/[0.05] light:bg-[var(--card)]/50 border border-white/[0.08] dark:border-white/[0.08] light:border-[var(--border)] text-[var(--text)] dark:text-white light:text-[var(--text)]'
                        )}
                        role="presentation"
                      >
                        {msg.sender === 'ai' ? (
                          <div className="text-[11px] leading-relaxed">
                            {msg.content}
                          </div>
                        ) : (
                          <div className="text-[12px] leading-relaxed">
                            {msg.content}
                          </div>
                        )}
                      </div>
                      
                      {/* Inline fusion preview for AI responses */}
                      {msg.sender === 'ai' && fusionPreview && idx === messages.length - 1 && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.2 }}
                          className="ml-1 mt-2"
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <Sparkles className="h-3 w-3 text-[#ff00aa]" />
                            <span className="text-[9px] font-black uppercase tracking-widest text-[#ff00aa]/70">
                              Updated Fusion Preview
                            </span>
                          </div>
                          <div className="bg-black/40 border border-[#00f0ff]/10 rounded-lg p-3 backdrop-blur-sm">
                            <div className="flex items-center gap-2 mb-2">
                              <Film className="h-3 w-3 text-[#00f0ff]" />
                              <h4 className="text-[11px] font-black text-white uppercase tracking-tight">
                                {fusionPreview.title}
                              </h4>
                            </div>
                            <p className="text-[10px] text-zinc-400 italic leading-relaxed">
                              "{fusionPreview.tagline}"
                            </p>
                          </div>
                        </motion.div>
                      )}
                      
                      <span className="text-[9px] text-zinc-700 mx-1">
                        {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </motion.div>
                  ))}
                  <div ref={bottomRef} />
                </>
              )}
            </div>

            {/* Quick prompts */}
            {messages.length > 0 && (
              <div className="px-4 pb-2 flex gap-1.5 overflow-x-auto scrollbar-hide flex-shrink-0">
                {QUICK_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => {
                      setInput(prompt);
                      textareaRef.current?.focus();
                    }}
                    className="flex-shrink-0 text-[9px] font-bold text-zinc-500 dark:text-zinc-500 light:text-zinc-600 hover:text-[var(--primary)] border border-white/[0.06] dark:border-white/[0.06] light:border-[var(--border)] hover:border-[var(--primary)]/20 px-2.5 py-1 rounded-full transition-all uppercase tracking-wider whitespace-nowrap focus-ring"
                    aria-label={`Quick prompt: ${prompt}`}
                    tabIndex={0}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <div className="px-4 pb-4 flex-shrink-0">
              <div className="chat-input-bar dark:chat-input-bar light:bg-[var(--card)] light:border light:border-[var(--border)] rounded-2xl p-3 transition-colors duration-300">
                <textarea
                  ref={textareaRef}
                  placeholder="Give director notes..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKey}
                  className="flex-1 bg-transparent text-[var(--text)] dark:text-white light:text-[var(--text)] placeholder:text-zinc-600 dark:placeholder:text-zinc-600 light:placeholder:text-zinc-500 resize-none outline-none text-sm transition-colors duration-300"
                  rows={1}
                  style={{ resize: 'none', outline: 'none' }}
                  aria-label="Director notes input"
                  aria-describedby="character-count"
                />
                <motion.button
                  whileHover={input.trim() ? { scale: 1.1 } : {}}
                  whileTap={input.trim() ? { scale: 0.93 } : {}}
                  onClick={handleSend}
                  disabled={!input.trim()}
                  className={cn(
                    'flex-shrink-0 h-8 w-8 rounded-xl flex items-center justify-center transition-all focus-ring',
                    input.trim()
                      ? 'bg-[#00f0ff] text-black'
                      : 'bg-white/[0.05] text-zinc-700'
                  )}
                  aria-label="Send director notes"
                  aria-disabled={!input.trim()}
                  tabIndex={0}
                >
                  <Send className={`h-3.5 w-3.5 ${input.trim() ? 'glowing-send-arrow' : ''}`} />
                </motion.button>
              </div>
              
              {/* Character count hint */}
              {input.length > 0 && (
                <div className="mt-1 text-right">
                  <span id="character-count" className="text-[8px] text-zinc-700 font-medium">
                    {input.length}/500
                  </span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
