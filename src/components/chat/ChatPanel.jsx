import React, { useRef, useEffect } from 'react';

const SUGGESTED_QUESTIONS = [
  'Why is total energy drifting?',
  'Is this orbital configuration chaotic?',
  'What will happen next in this system?',
  'Explain conservation of momentum here',
  'Why do bodies speed up when close?',
];

const CHAT_MODES = [
  { key: 'normal', label: '💬 Chat', title: 'Interactive Physics Q&A' },
  { key: 'narrate', label: '🎙 Narrate', title: 'Documentary voiceover every 9s' },
  { key: 'quiz', label: '📝 Quiz', title: 'Multiple-choice physics quiz' },
  { key: 'judge', label: '🎓 Judge', title: 'Competition judge testing questions' },
];

export function ChatPanel({
  onClose,
  messages,
  input,
  onInputChange,
  onSend,
  loading,
  error,
  chatMode,
  onSetMode,
  onExplain,
  onStartNarrate,
  onStopNarrate,
  narrateActive,
  onQuiz,
  onJudge,
  onExportChat,
  onOpenApiKeyModal,
}) {
  const chatScrollRef = useRef(null);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <div
      className="absolute bottom-16 right-3 z-[35] w-88 max-w-[calc(100vw-1.5rem)] bg-[#040812]/95 backdrop-blur-md border border-white/20 flex flex-col font-mono shadow-[0_0_30px_rgba(0,0,0,0.8)]"
      style={{ height: '27rem' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/10 shrink-0 bg-white/5">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <span className="text-[11px] tracking-[0.2em] text-slate-200 font-semibold">
            AI PHYSICS TUTOR
          </span>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={onOpenApiKeyModal}
            title="Configure Groq API Key"
            className="text-slate-400 hover:text-cyan-300 text-xs transition-colors"
          >
            ⚙
          </button>
          <button
            onClick={onExportChat}
            title="Export conversation history"
            className="text-slate-400 hover:text-cyan-300 text-xs transition-colors"
          >
            ⬇
          </button>
          <button
            onClick={onClose}
            aria-label="Close chat"
            className="text-slate-400 hover:text-cyan-300 text-sm transition-colors"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Mode selection row */}
      <div className="flex gap-1 px-2 pt-2 pb-1.5 shrink-0 overflow-x-auto border-b border-white/5">
        {CHAT_MODES.map((m) => (
          <button
            key={m.key}
            title={m.title}
            onClick={() => {
              onSetMode(m.key);
              if (m.key === 'narrate') onStartNarrate();
              else onStopNarrate();
              if (m.key === 'quiz') onQuiz();
              if (m.key === 'judge') onJudge();
            }}
            className={`whitespace-nowrap text-[9px] px-2 py-1 border transition-all ${
              chatMode === m.key
                ? 'border-cyan-400/70 text-cyan-200 bg-cyan-400/15 font-semibold'
                : 'border-white/10 text-slate-400 hover:text-slate-200 hover:border-white/20'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Quick-action buttons */}
      <div className="flex gap-1.5 px-2 py-1.5 shrink-0 border-b border-white/5 bg-white/2">
        <button
          onClick={onExplain}
          disabled={loading}
          className="text-[9px] px-2 py-1 border border-violet-400/50 text-violet-200 bg-violet-950/30 hover:bg-violet-400/15 disabled:opacity-40 whitespace-nowrap tracking-wide"
        >
          🔍 EXPLAIN NOW
        </button>
        <button
          onClick={() => onSend('What should I watch for in this simulation?')}
          disabled={loading}
          className="text-[9px] px-2 py-1 border border-white/15 text-slate-300 hover:text-cyan-200 hover:border-cyan-400/30 disabled:opacity-40 whitespace-nowrap tracking-wide"
        >
          💡 TIPS
        </button>
        {narrateActive && (
          <span className="ml-auto text-[9px] text-amber-300 flex items-center gap-1 animate-pulse">
            ● Narrating live
          </span>
        )}
      </div>

      {/* Message container */}
      <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-3 space-y-2.5 min-h-0">
        {messages.length === 0 && (
          <div className="space-y-2 pt-1">
            <div className="text-[10px] text-slate-400 font-semibold tracking-wider">
              SUGGESTED QUESTIONS
            </div>
            {SUGGESTED_QUESTIONS.map((q) => (
              <button
                key={q}
                onClick={() => onSend(q)}
                disabled={loading}
                className="block w-full text-left text-[11px] text-slate-300 border border-white/10 px-2.5 py-1.5 hover:border-cyan-400/40 hover:text-cyan-200 hover:bg-white/5 transition-all"
              >
                {q}
              </button>
            ))}
          </div>
        )}

        {messages.map((m, i) => (
          <div
            key={i}
            className={`text-xs leading-relaxed ${m.role === 'user' ? 'text-right' : 'text-left'}`}
          >
            <div
              className={`inline-block px-2.5 py-1.5 max-w-[92%] whitespace-pre-wrap text-left ${
                m.role === 'user'
                  ? 'bg-cyan-400/15 text-cyan-100 border border-cyan-400/30'
                  : 'bg-white/5 text-slate-200 border border-white/10'
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2 text-xs text-cyan-300/80">
            <span className="animate-pulse">●</span> thinking…
          </div>
        )}

        {error && (
          <div className="text-xs text-amber-300 border border-amber-400/40 bg-amber-950/40 px-2.5 py-1.5 flex flex-col gap-1">
            <span>{error}</span>
            {error.toLowerCase().includes('key') && (
              <button
                onClick={onOpenApiKeyModal}
                className="text-[10px] text-cyan-300 underline self-start cursor-pointer"
              >
                Configure Groq API Key
              </button>
            )}
          </div>
        )}
      </div>

      {/* Input row */}
      <div className="flex items-center gap-1.5 p-2 border-t border-white/10 shrink-0 bg-black/60">
        <input
          type="text"
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            chatMode === 'quiz'
              ? 'Answer A, B, C or D…'
              : chatMode === 'judge'
              ? 'Answer the judge…'
              : 'Ask physics tutor or type command…'
          }
          className="flex-1 bg-black/80 border border-white/15 text-slate-200 px-2.5 py-1.5 text-xs font-mono focus:border-cyan-400 focus:outline-none"
        />
        <button
          onClick={() => onSend()}
          disabled={loading || !input.trim()}
          className="px-3 py-1.5 border border-cyan-400/50 text-cyan-200 text-xs font-semibold disabled:opacity-40 hover:bg-cyan-400/20 transition-colors"
        >
          SEND
        </button>
      </div>
    </div>
  );
}
