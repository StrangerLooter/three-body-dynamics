import React, { useRef, useEffect } from 'react';

const SUGGESTED_QUESTIONS = [
  'Why is the three-body problem analytically unsolvable?',
  'What is the physical significance of the Lyapunov exponent?',
  'Explain how Velocity Verlet conserves phase space volume.',
  'How do Lagrange points form in this system?',
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
      className="fixed right-2 sm:right-3 bottom-16 w-[22rem] sm:w-[24rem] max-w-[calc(100vw-1rem)] h-[28rem] max-h-[75vh] bg-[#02050c]/95 backdrop-blur-lg border-2 border-cyan-400/40 rounded-xs shadow-[0_0_35px_rgba(0,0,0,0.85)] z-40 flex flex-col font-mono select-none overflow-hidden"
    >
      {/* Panel header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/10 bg-white/5 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-cyan-300 text-sm">◈</span>
          <span className="text-xs text-slate-100 font-semibold tracking-wider">
            AI PHYSICS TUTOR
          </span>
          <span className="text-[9px] px-1.5 py-0.2 border border-cyan-400/40 bg-cyan-950/40 text-cyan-300">
            GROQ
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onExportChat}
            title="Export conversation history (TXT)"
            aria-label="Export chat"
            className="text-slate-400 hover:text-cyan-300 text-xs px-1"
          >
            ↓
          </button>
          <button
            onClick={onOpenApiKeyModal}
            title="Configure Groq API Key"
            aria-label="Configure API Key"
            className="text-slate-400 hover:text-cyan-300 text-xs px-1"
          >
            ⚙
          </button>
          <button
            onClick={onClose}
            aria-label="Close chat panel"
            className="text-slate-400 hover:text-cyan-300 text-sm px-1 font-bold"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Mode selection buttons */}
      <div className="flex items-center gap-1 px-2 py-1.5 border-b border-white/5 bg-black/40 overflow-x-auto shrink-0 custom-scrollbar">
        <button
          onClick={() => {
            onSetMode('normal');
            if (narrateActive) onStopNarrate();
          }}
          className={`text-[9px] px-2 py-1 border whitespace-nowrap tracking-wider transition-colors ${
            chatMode === 'normal'
              ? 'border-cyan-400/70 text-cyan-200 bg-cyan-400/15 font-semibold'
              : 'border-white/10 text-slate-400 hover:text-slate-200'
          }`}
        >
          TUTOR
        </button>

        {!narrateActive ? (
          <button
            onClick={onStartNarrate}
            className="text-[9px] px-2 py-1 border border-white/10 text-slate-400 hover:text-amber-300 hover:border-amber-400/40 whitespace-nowrap tracking-wider transition-colors"
          >
            🎙 NARRATE
          </button>
        ) : (
          <button
            onClick={onStopNarrate}
            className="text-[9px] px-2 py-1 border border-amber-400/70 text-amber-200 bg-amber-400/20 font-semibold animate-pulse whitespace-nowrap tracking-wider transition-colors"
          >
            ■ STOP NARRATE
          </button>
        )}

        <button
          onClick={() => {
            onSetMode('quiz');
            onQuiz();
          }}
          className={`text-[9px] px-2 py-1 border whitespace-nowrap tracking-wider transition-colors ${
            chatMode === 'quiz'
              ? 'border-cyan-400/70 text-cyan-200 bg-cyan-400/15 font-semibold'
              : 'border-white/10 text-slate-400 hover:text-slate-200'
          }`}
        >
          QUIZ
        </button>

        <button
          onClick={() => {
            onSetMode('judge');
            onJudge();
          }}
          className={`text-[9px] px-2 py-1 border whitespace-nowrap tracking-wider transition-colors ${
            chatMode === 'judge'
              ? 'border-cyan-400/70 text-cyan-200 bg-cyan-400/15 font-semibold'
              : 'border-white/10 text-slate-400 hover:text-slate-200'
          }`}
        >
          JUDGE
        </button>
      </div>

      {/* Quick context triggers */}
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

      {/* Message container with strict width wrapping */}
      <div ref={chatScrollRef} className="flex-1 overflow-y-auto overflow-x-hidden p-3 space-y-2.5 min-h-0 custom-scrollbar">
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
            className={`w-full ${m.role === 'user' ? 'text-right' : 'text-left'}`}
          >
            <div
              className={`inline-block px-2.5 py-1.5 max-w-full text-left text-xs leading-relaxed break-words whitespace-pre-wrap overflow-hidden ${
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
          <div className="text-xs text-amber-300 border border-amber-400/40 bg-amber-950/40 px-2.5 py-1.5 flex flex-col gap-1 break-words">
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
              : 'Ask physics tutor or command…'
          }
          className="flex-1 min-w-0 bg-black/80 border border-white/15 text-slate-200 px-2.5 py-1.5 text-xs font-mono focus:border-cyan-400 focus:outline-none"
        />
        <button
          onClick={() => onSend()}
          disabled={loading || !input.trim()}
          className="px-3 py-1.5 border border-cyan-400/50 text-cyan-200 text-xs font-semibold disabled:opacity-40 hover:bg-cyan-400/20 transition-colors shrink-0"
        >
          SEND
        </button>
      </div>
    </div>
  );
}
