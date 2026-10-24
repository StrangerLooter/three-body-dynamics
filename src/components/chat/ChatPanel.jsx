import React, { useRef, useEffect, useState, useMemo } from 'react';
import { FormattedMessage } from './ChatFormatter.jsx';

const MODE_DEFINITIONS = [
  { id: 'normal', label: 'TUTOR', desc: 'Comprehensive physics assistant' },
  { id: 'quick', label: 'QUICK', desc: 'Direct, concise answers' },
  { id: 'learn', label: 'LEARN', desc: 'Intuitive conceptual explanations' },
  { id: 'math', label: 'MATH', desc: 'Equations and derivations' },
  { id: 'research', label: 'RESEARCH', desc: 'Dynamical systems analysis' },
  { id: 'code', label: 'CODE', desc: 'Numerical algorithms & integrators' },
  { id: 'experiment', label: 'EXPERIMENT', desc: 'Hypothesis & test planning' },
  { id: 'report', label: 'REPORT', desc: 'Publication-ready scientific brief' },
  { id: 'quiz', label: 'QUIZ', desc: 'Interactive physics question' },
  { id: 'judge', label: 'JUDGE', desc: 'Academic symposium defense' },
];

export function ChatPanel({
  onClose,
  messages = [],
  input = '',
  onInputChange,
  onSend,
  loading = false,
  error = null,
  chatMode = 'normal',
  onSetMode,
  onExplain,
  onStartNarrate,
  onStopNarrate,
  narrateActive = false,
  onQuiz,
  onJudge,
  onExportChat,
  onOpenApiKeyModal,
  onClearChat,
  onRegenerate,
  onCancel,
  simState = null,
  telemetry = null,
  apiKeyPresent = false,
  currentModel = 'openai/gpt-oss-120b',
}) {
  const chatScrollRef = useRef(null);
  const textareaRef = useRef(null);
  const [isWide, setIsWide] = useState(false);
  const [showTelemetryInspector, setShowTelemetryInspector] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const isNearBottomRef = useRef(true);

  // Auto-scroll management
  const handleScroll = () => {
    if (!chatScrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatScrollRef.current;
    isNearBottomRef.current = scrollHeight - scrollTop - clientHeight < 60;
  };

  useEffect(() => {
    if (chatScrollRef.current && isNearBottomRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  // Adjust textarea height automatically
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [input]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!loading && input.trim()) {
        onSend();
      }
    }
  };

  const handleCopyMessage = (text, idx) => {
    navigator.clipboard?.writeText?.(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 1800);
  };

  // Dynamic suggested prompts based on current simulation state
  const suggestedPrompts = useMemo(() => {
    const integrator = (simState?.integrator || 'rk4').toUpperCase();
    const preset = simState?.presetKey || 'solarSystem';
    return [
      `Analyze the stability and orbital resonance of the current ${preset} orbit`,
      `Evaluate energy drift in the ${integrator} integrator and compare with symplectic Verlet`,
      `Examine whether any body exhibits escape trajectory or close encounter right now`,
      `Design an experiment to test sensitivity to initial conditions in this configuration`,
      `Explain the physical and geometric significance of Lagrange points in this system`,
    ];
  }, [simState?.presetKey, simState?.integrator]);

  const presetLabel = (simState?.presetKey || 'SOLAR').toUpperCase();
  const integratorLabel = (simState?.integrator || 'RK4').toUpperCase();
  const timeLabel = (simState?.simTime || 0).toFixed(1);

  return (
    <div
      className={`fixed left-2 right-2 sm:left-auto sm:right-3 bottom-14 ${
        isWide ? 'w-auto sm:w-[36rem]' : 'w-auto sm:w-[27rem]'
      } max-w-[calc(100vw-1rem)] h-[32rem] sm:h-[38rem] max-h-[calc(100vh-6.5rem)] bg-[#0B0B0C] border border-[#29292D] rounded-xs shadow-[0_16px_50px_rgba(0,0,0,0.92)] z-40 flex flex-col font-mono select-none overflow-hidden transition-all duration-200`}
    >
      {/* 1. Header Bar */}
      <div className="flex items-center justify-between px-2.5 sm:px-3 py-2 border-b border-[#29292D] bg-[#121214] shrink-0">
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
          <span className="text-[#C7A46A] text-sm leading-none shrink-0">◈</span>
          <span className="text-xs text-[#F2F2F3] font-semibold tracking-[0.12em] sm:tracking-[0.15em] truncate">
            PHYSICS COPILOT
          </span>

          {/* Connection Status Badge */}
          {apiKeyPresent ? (
            <span
              title="Groq API Key configured and active"
              className="text-[9px] px-1.5 py-0.5 border border-[#29292D] bg-[#18181B] text-[#C7A46A] flex items-center gap-1 rounded-xs"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#C7A46A] animate-pulse" />
              ONLINE
            </span>
          ) : (
            <button
              onClick={onOpenApiKeyModal}
              title="Click to configure Groq API Key"
              className="text-[9px] px-1.5 py-0.5 border border-[#29292D] bg-[#18181B] text-[#929298] hover:text-[#C7A46A] flex items-center gap-1 rounded-xs transition-colors"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#929298]" />
              NO KEY
            </button>
          )}
        </div>

        {/* Header Action Controls */}
        <div className="flex items-center gap-1 shrink-0 text-[#929298]">
          <button
            onClick={() => setShowTelemetryInspector((v) => !v)}
            title={showTelemetryInspector ? 'Hide Telemetry Snapshot' : 'Inspect Live Telemetry Snapshot'}
            aria-label="Toggle Telemetry Inspector"
            className={`px-1.5 py-1 text-xs transition-colors rounded-xs border ${
              showTelemetryInspector
                ? 'border-[#C7A46A] text-[#C7A46A] bg-[#C7A46A]/10'
                : 'border-transparent hover:text-[#F2F2F3] hover:border-[#29292D]'
            }`}
          >
            📊
          </button>

          <button
            onClick={onExportChat}
            title="Export conversation history"
            aria-label="Export conversation"
            className="px-1.5 py-1 text-xs hover:text-[#F2F2F3] transition-colors rounded-xs border border-transparent hover:border-[#29292D]"
          >
            ↓
          </button>

          <button
            onClick={onClearChat}
            title="Clear conversation"
            aria-label="Clear chat"
            className="px-1.5 py-1 text-xs hover:text-[#F2F2F3] transition-colors rounded-xs border border-transparent hover:border-[#29292D]"
          >
            🗑
          </button>

          <button
            onClick={onOpenApiKeyModal}
            title="Configure API Key and Model"
            aria-label="Settings"
            className="px-1.5 py-1 text-xs hover:text-[#F2F2F3] transition-colors rounded-xs border border-transparent hover:border-[#29292D]"
          >
            ⚙
          </button>

          <button
            onClick={() => setIsWide((w) => !w)}
            title={isWide ? 'Compact width' : 'Expand width'}
            aria-label="Toggle width"
            className="hidden sm:inline-block px-1.5 py-1 text-xs hover:text-[#F2F2F3] transition-colors rounded-xs border border-transparent hover:border-[#29292D]"
          >
            {isWide ? '⤡' : '⤢'}
          </button>

          <button
            onClick={onClose}
            title="Close Physics Copilot"
            aria-label="Close panel"
            className="px-1.5 py-1 text-sm font-bold hover:text-[#F2F2F3] transition-colors rounded-xs border border-transparent hover:border-[#29292D]"
          >
            ✕
          </button>
        </div>
      </div>

      {/* 2. Live Context Indicator Strip */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#18181B] border-b border-[#29292D] text-[10px] text-[#929298] shrink-0 font-mono">
        <div className="flex items-center gap-2 truncate">
          <span className="text-[#C7A46A]">●</span>
          <span className="tracking-wider text-[#F2F2F3] font-semibold">LIVE CONTEXT</span>
          <span>·</span>
          <span className="text-[#929298]">{presetLabel}</span>
          <span>·</span>
          <span className="text-[#929298]">{integratorLabel}</span>
          <span>·</span>
          <span>t={timeLabel}s</span>
        </div>

        <button
          onClick={() => setShowTelemetryInspector((v) => !v)}
          className="text-[#929298] hover:text-[#C7A46A] text-[9.5px] uppercase tracking-wider underline shrink-0 transition-colors"
        >
          {showTelemetryInspector ? 'Close Telemetry ▲' : 'View Snapshot ▼'}
        </button>
      </div>

      {/* 3. Collapsible Live Telemetry Inspector Drawer */}
      {showTelemetryInspector && (
        <div className="p-3 bg-[#0B0B0C] border-b border-[#29292D] max-h-48 overflow-y-auto custom-scrollbar shrink-0 text-[10.5px] text-[#929298] space-y-2">
          <div className="flex items-center justify-between text-[#F2F2F3] font-semibold border-b border-[#29292D] pb-1">
            <span>DETERMINISTIC SIMULATION SNAPSHOT</span>
            <span className="text-[#C7A46A] text-[9.5px]">t={timeLabel}s</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[10px]">
            <div>
              <span className="text-[#F2F2F3] block">Preset: {presetLabel}</span>
              <span>Integrator: {integratorLabel} (dt={simState?.dt?.toExponential(1)})</span>
            </div>
            <div>
              <span className="text-[#F2F2F3] block">
                Total Energy: {telemetry?.energy?.total?.toFixed(4) || '—'}
              </span>
              <span>
                Energy Drift: {telemetry?.energyError !== undefined ? `${(telemetry.energyError * 100).toFixed(4)}%` : '—'}
              </span>
            </div>
          </div>

          {telemetry?.pairDist && (
            <div className="text-[10px] space-y-0.5 border-t border-[#29292D] pt-1">
              <span className="text-[#F2F2F3] block">Pairwise Distances:</span>
              <div className="grid grid-cols-3 gap-1">
                <span>B1–B2: {telemetry.pairDist.d01?.toFixed(3)}</span>
                <span>B1–B3: {telemetry.pairDist.d02?.toFixed(3)}</span>
                <span>B2–B3: {telemetry.pairDist.d12?.toFixed(3)}</span>
              </div>
            </div>
          )}

          {simState?.chaosOn && (
            <div className="text-[10px] border-t border-[#29292D] pt-1 text-[#C7A46A]">
              <span>Chaos Lab Active: Separation Δ={telemetry?.chaosSep?.toExponential(3)}</span>
              {telemetry?.chaosLyap !== null && telemetry?.chaosLyap !== undefined && (
                <span className="block">λ_lyap ≈ {telemetry.chaosLyap.toFixed(4)} s⁻¹</span>
              )}
            </div>
          )}
        </div>
      )}

      {/* 4. Mode Selection Bar */}
      <div className="flex items-center gap-1 px-2.5 py-1.5 border-b border-[#29292D] bg-[#121214] overflow-x-auto shrink-0 custom-scrollbar">
        {MODE_DEFINITIONS.map((m) => (
          <button
            key={m.id}
            onClick={() => {
              onSetMode(m.id);
              if (narrateActive) onStopNarrate();
              if (m.id === 'quiz' && onQuiz) onQuiz();
              if (m.id === 'judge' && onJudge) onJudge();
            }}
            title={m.desc}
            className={`text-[9.5px] px-2 py-1 border rounded-xs whitespace-nowrap tracking-wider font-mono transition-colors ${
              chatMode === m.id
                ? 'border-[#C7A46A] text-[#F2F2F3] bg-[#C7A46A]/20 font-semibold'
                : 'border-[#29292D] text-[#929298] hover:text-[#F2F2F3] hover:border-[#929298]/40'
            }`}
          >
            {m.label}
          </button>
        ))}

        {/* Live Narration Mode Toggle */}
        {!narrateActive ? (
          <button
            onClick={onStartNarrate}
            title="Start live speech documentary narration"
            className="text-[9.5px] px-2 py-1 border border-[#29292D] text-[#929298] hover:text-[#C7A46A] hover:border-[#C7A46A]/40 rounded-xs whitespace-nowrap tracking-wider transition-colors"
          >
            🎙 NARRATE
          </button>
        ) : (
          <button
            onClick={onStopNarrate}
            title="Stop live voice narration"
            className="text-[9.5px] px-2 py-1 border border-[#C7A46A] text-[#F2F2F3] bg-[#C7A46A]/25 font-semibold animate-pulse rounded-xs whitespace-nowrap tracking-wider transition-colors"
          >
            ■ STOP NARRATE
          </button>
        )}
      </div>

      {/* 5. Quick Context Action Strip */}
      <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-[#29292D] bg-[#18181B] shrink-0 text-[10px]">
        <button
          onClick={onExplain}
          disabled={loading}
          className="px-2 py-0.5 border border-[#29292D] text-[#F2F2F3] hover:border-[#C7A46A] hover:text-[#C7A46A] rounded-xs disabled:opacity-40 transition-colors"
        >
          🔍 EXPLAIN NOW
        </button>

        <button
          onClick={() => onSend('What critical physical behavior should I observe in this orbit right now?')}
          disabled={loading}
          className="px-2 py-0.5 border border-[#29292D] text-[#929298] hover:text-[#F2F2F3] rounded-xs disabled:opacity-40 transition-colors"
        >
          💡 OBSERVATION GUIDE
        </button>

        <button
          onClick={() => onSend('Generate a publication-ready scientific brief and telemetry analysis of the current state.')}
          disabled={loading}
          className="px-2 py-0.5 border border-[#29292D] text-[#929298] hover:text-[#F2F2F3] rounded-xs disabled:opacity-40 transition-colors hidden sm:inline-block"
        >
          📑 REPORT
        </button>

        {narrateActive && (
          <span className="ml-auto text-[9.5px] text-[#C7A46A] flex items-center gap-1 animate-pulse">
            ● Narrating live
          </span>
        )}
      </div>

      {/* 6. Message Scroll Area */}
      <div
        ref={chatScrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto overflow-x-hidden p-3.5 space-y-3.5 min-h-0 custom-scrollbar"
      >
        {/* Empty State with Technical Guidance & Prompts */}
        {messages.length === 0 && (
          <div className="space-y-3 pt-1">
            <div className="p-3 bg-[#121214] border border-[#29292D] rounded-xs space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#F2F2F3]">
                <span className="text-[#C7A46A]">◈</span>
                <span>PHYSICS COPILOT v2.0</span>
              </div>
              <p className="text-[11px] text-[#929298] leading-relaxed">
                Scientific AI workstation for 3D Three-Body Gravitational Dynamics. Real-time telemetry reasoning, conservation diagnostics, integrator error analysis, and chaotic divergence tracking.
              </p>
            </div>

            <div className="space-y-1.5">
              <div className="text-[10px] text-[#929298] font-semibold tracking-wider uppercase">
                SUGGESTED INVESTIGATIONS
              </div>
              {suggestedPrompts.map((q) => (
                <button
                  key={q}
                  onClick={() => onSend(q)}
                  disabled={loading}
                  className="block w-full text-left text-[11px] text-[#F2F2F3] border border-[#29292D] bg-[#121214] hover:bg-[#18181B] hover:border-[#C7A46A]/60 px-3 py-2 rounded-xs transition-all leading-snug"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Message Items */}
        {messages.map((m, i) => (
          <div
            key={i}
            className={`w-full flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div
              className={`max-w-[95%] sm:max-w-[90%] rounded-xs text-left leading-relaxed ${
                m.role === 'user'
                  ? 'bg-[#18181B] text-[#F2F2F3] border border-[#29292D] px-3 py-2 text-xs'
                  : 'bg-[#121214] text-[#F2F2F3] border border-[#29292D] p-3 text-xs w-full'
              }`}
            >
              {m.role === 'assistant' ? (
                <FormattedMessage content={m.content} />
              ) : (
                <div className="break-words whitespace-pre-wrap">{m.content}</div>
              )}
            </div>

            {/* Assistant Response Action Toolbar */}
            {m.role === 'assistant' && (
              <div className="flex items-center gap-1.5 mt-1 text-[10px] text-[#929298] px-1 select-none">
                <button
                  onClick={() => handleCopyMessage(m.content, i)}
                  className="hover:text-[#F2F2F3] transition-colors px-1 py-0.5 rounded-xs hover:bg-[#18181B]"
                  title="Copy response text"
                >
                  {copiedIndex === i ? '✓ Copied' : 'Copy'}
                </button>

                <span>·</span>

                <button
                  onClick={() => onRegenerate?.(i)}
                  disabled={loading}
                  className="hover:text-[#F2F2F3] transition-colors px-1 py-0.5 rounded-xs hover:bg-[#18181B] disabled:opacity-40"
                  title="Regenerate with fresh simulation telemetry"
                >
                  Regenerate
                </button>

                <span>·</span>

                <button
                  onClick={() => onSend('Can you explain that in simpler, more intuitive terms with an analogy?')}
                  disabled={loading}
                  className="hover:text-[#F2F2F3] transition-colors px-1 py-0.5 rounded-xs hover:bg-[#18181B] disabled:opacity-40"
                  title="Ask for simpler explanation"
                >
                  Simpler
                </button>

                <span>·</span>

                <button
                  onClick={() => onSend('Show the exact mathematical derivation, equations of motion, and units for this.')}
                  disabled={loading}
                  className="hover:text-[#F2F2F3] transition-colors px-1 py-0.5 rounded-xs hover:bg-[#18181B] disabled:opacity-40"
                  title="Request mathematical derivation"
                >
                  Math Detail
                </button>

                <span>·</span>

                <button
                  onClick={() => onSend('Please expand on this analysis with further physical implications.')}
                  disabled={loading}
                  className="hover:text-[#F2F2F3] transition-colors px-1 py-0.5 rounded-xs hover:bg-[#18181B] disabled:opacity-40 hidden sm:inline-block"
                  title="Expand explanation"
                >
                  Expand
                </button>
              </div>
            )}
          </div>
        ))}

        {/* Loading Indicator */}
        {loading && (
          <div className="flex items-center gap-2 text-xs text-[#C7A46A] p-2 bg-[#121214] border border-[#29292D] rounded-xs font-mono">
            <span className="animate-pulse">●</span>
            <span>COMPUTING DYNAMICS & TELEMETRY…</span>
          </div>
        )}

        {/* Error Banner */}
        {error && (
          <div className="text-xs text-[#F2F2F3] border border-red-500/40 bg-red-950/30 p-3 rounded-xs flex flex-col gap-2 break-words font-mono">
            <div className="flex items-center gap-2 text-red-400 font-semibold">
              <span>⚠</span>
              <span>REQUEST ERROR</span>
            </div>
            <p className="text-[11px] text-[#929298] leading-relaxed">{error}</p>
            <div className="flex items-center gap-3 pt-1">
              <button
                onClick={() => onRegenerate?.(messages.length - 1)}
                className="text-[10px] text-[#C7A46A] border border-[#C7A46A]/40 px-2 py-0.5 rounded-xs hover:bg-[#C7A46A]/20 transition-colors"
              >
                Retry Request
              </button>
              {error.toLowerCase().includes('key') && (
                <button
                  onClick={onOpenApiKeyModal}
                  className="text-[10px] text-[#F2F2F3] underline hover:text-[#C7A46A] transition-colors"
                >
                  Configure Groq API Key ⚙
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 7. Composer and Input Controls */}
      <div className="p-2.5 border-t border-[#29292D] bg-[#121214] shrink-0">
        <div className="flex items-end gap-2 bg-[#18181B] border border-[#29292D] rounded-xs p-1.5 focus-within:border-[#C7A46A] transition-colors">
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              chatMode === 'quiz'
                ? 'Answer A, B, C or D…'
                : chatMode === 'judge'
                ? 'Defend your simulator…'
                : 'Ask about simulation, request an experiment, or enter command…'
            }
            className="flex-1 bg-transparent text-[#F2F2F3] px-2 py-1 text-xs font-mono resize-none focus:outline-none placeholder:text-[#929298]/50 min-h-[28px] max-h-[120px] custom-scrollbar"
          />

          {loading ? (
            <button
              onClick={onCancel}
              title="Stop Generation"
              className="px-3 py-1.5 border border-red-500/50 bg-red-950/40 text-red-300 text-xs font-semibold rounded-xs hover:bg-red-900/50 transition-colors shrink-0 flex items-center gap-1"
            >
              ■ STOP
            </button>
          ) : (
            <button
              onClick={() => onSend()}
              disabled={!input.trim()}
              className="px-3 py-1.5 border border-[#C7A46A]/60 bg-[#C7A46A]/15 text-[#F2F2F3] text-xs font-semibold rounded-xs disabled:opacity-30 hover:bg-[#C7A46A]/25 transition-colors shrink-0 flex items-center gap-1 tracking-wider"
            >
              SEND ↵
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
