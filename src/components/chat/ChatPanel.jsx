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
  currentModel = 'llama-3.3-70b-versatile',
  onApplyPreset,
  onRunSimulation,
  onPauseSimulation,
}) {
  const chatScrollRef = useRef(null);
  const textareaRef = useRef(null);
  const [isWide, setIsWide] = useState(false);
  const [activeBottomDrawer, setActiveBottomDrawer] = useState(null); // 'modes' | 'telemetry' | 'prompts' | null
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [showScrollBottomBtn, setShowScrollBottomBtn] = useState(false);
  const isNearBottomRef = useRef(true);
  const lastSendTimeRef = useRef(0);

  const focusTextarea = () => {
    requestAnimationFrame(() => {
      textareaRef.current?.focus();
    });
  };

  // Smart User-Aware Auto-Scroll Management
  const handleScroll = () => {
    if (!chatScrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatScrollRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 75;
    isNearBottomRef.current = isAtBottom;
    setShowScrollBottomBtn(!isAtBottom);
  };

  const scrollToBottom = (smooth = true) => {
    if (!chatScrollRef.current) return;
    chatScrollRef.current.scrollTo({
      top: chatScrollRef.current.scrollHeight,
      behavior: smooth ? 'smooth' : 'auto',
    });
    isNearBottomRef.current = true;
    setShowScrollBottomBtn(false);
  };

  useEffect(() => {
    if (isNearBottomRef.current) {
      scrollToBottom(false);
    }
  }, [messages, loading]);

  // Adjust textarea height automatically
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [input]);

  // Debounced, double-submit guarded send handler
  const handleSendSafe = (textToSend) => {
    const now = Date.now();
    if (now - lastSendTimeRef.current < 250) return;
    if (loading) return;

    const messageText = typeof textToSend === 'string' && textToSend.trim() ? textToSend.trim() : input.trim();
    if (!messageText) return;

    lastSendTimeRef.current = now;
    if (typeof textToSend === 'string' && textToSend.trim()) {
      onSend(textToSend);
    } else {
      onSend();
    }
    focusTextarea();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!loading && input.trim()) {
        handleSendSafe();
      }
    }
  };

  const handleModeChange = (modeId) => {
    try {
      window.localStorage.setItem('copilot_chat_mode', modeId);
    } catch (e) {}
    onSetMode(modeId);
    if (narrateActive) onStopNarrate();
    if (modeId === 'quiz' && onQuiz) onQuiz();
    if (modeId === 'judge' && onJudge) onJudge();
    setActiveBottomDrawer(null);
    focusTextarea();
  };

  const handleCopyMessage = (text, idx) => {
    navigator.clipboard?.writeText?.(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 1800);
  };

  // Dynamic suggested prompts
  const suggestedPrompts = useMemo(() => {
    return [
      { text: 'Why is the Figure-8 orbit stable?', label: 'Figure-8 Stability' },
      { text: 'What masses, position, and velocity are needed for a stable Figure-8 orbit?', label: 'Figure-8 Parameters' },
      { text: 'Except Figure-8, what other stable orbit configurations exist? Can you show the equilateral triangle solution?', label: 'Equilateral Triangle' },
      { text: 'Set Lagrange triangle configuration and run', label: '▶ Set & Run Triangle' },
      { text: 'Evaluate energy drift in the current integrator', label: 'Energy Drift' },
    ];
  }, []);

  const currentModeObj = MODE_DEFINITIONS.find((m) => m.id === chatMode) || MODE_DEFINITIONS[0];
  const presetLabel = (simState?.presetKey || 'SOLAR').toUpperCase();
  const integratorLabel = (simState?.integrator || 'RK4').toUpperCase();
  const timeLabel = (simState?.simTime || 0).toFixed(1);

  return (
    <div
      className={`fixed left-2 right-2 sm:left-auto sm:right-3 bottom-14 ${
        isWide ? 'w-auto sm:w-[38rem]' : 'w-auto sm:w-[28rem]'
      } max-w-[calc(100vw-1rem)] h-[32rem] sm:h-[40rem] max-h-[calc(100vh-6.5rem)] bg-[#0C0C0F] border border-[#27272F] rounded-lg shadow-[0_20px_60px_rgba(0,0,0,0.95)] z-40 flex flex-col font-sans select-none overflow-hidden transition-all duration-200`}
    >
      {/* 1. Minimalist Modern Chat Header */}
      <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-[#24242A] bg-[#111116] shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[#C7A46A] text-sm leading-none shrink-0 drop-shadow-[0_0_8px_rgba(199,164,106,0.4)]">◈</span>
          <span className="text-xs text-[#F2F2F3] font-bold tracking-wider font-mono truncate">
            COPILOT
          </span>

          {/* Mode Pill Indicator */}
          <button
            onClick={() => setActiveBottomDrawer((d) => (d === 'modes' ? null : 'modes'))}
            title={`Active Mode: ${currentModeObj.label} — Click to switch`}
            className="text-[10px] px-2 py-0.5 rounded-full border border-[#2F2F3D] bg-[#1A1A22] text-[#C7A46A] font-mono hover:border-[#C7A46A]/60 transition-colors flex items-center gap-1"
          >
            <span>{currentModeObj.label}</span>
            <span className="text-[8px] text-[#929298]">▾</span>
          </button>

          {/* Online / Setup Status */}
          {apiKeyPresent ? (
            <span
              title="Groq AI Active & Online"
              className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#C7A46A]/10 text-[#C7A46A] border border-[#C7A46A]/30 flex items-center gap-1 font-mono"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#C7A46A] animate-pulse" />
              ONLINE
            </span>
          ) : (
            <button
              onClick={onOpenApiKeyModal}
              title="Click to enter Groq API Key (Built-in physics engine is active)"
              className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#1F1F27] text-[#929298] hover:text-[#C7A46A] border border-[#2F2F3D] flex items-center gap-1 font-mono transition-colors"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#929298]" />
              SETUP KEY
            </button>
          )}
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-1 text-[#929298]">
          <button
            onClick={onOpenApiKeyModal}
            title="Configure API Key and Model"
            aria-label="Settings"
            className="p-1 hover:text-[#F2F2F3] transition-colors rounded-xs hover:bg-[#1A1A22]"
          >
            ⚙
          </button>

          <button
            onClick={() => setIsWide((w) => !w)}
            title={isWide ? 'Compact width' : 'Expand width'}
            aria-label="Toggle width"
            className="hidden sm:inline-block p-1 text-xs hover:text-[#F2F2F3] transition-colors rounded-xs hover:bg-[#1A1A22]"
          >
            {isWide ? '⤡' : '⤢'}
          </button>

          <button
            onClick={onClose}
            title="Close Physics Copilot"
            aria-label="Close panel"
            className="p-1 hover:text-[#F2F2F3] transition-colors rounded-xs hover:bg-[#1A1A22] text-sm leading-none"
          >
            ✕
          </button>
        </div>
      </div>

      {/* 2. Message History (Distraction-Free Conversation) */}
      <div
        ref={chatScrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto overflow-x-hidden p-3.5 space-y-3.5 min-h-0 custom-scrollbar"
      >
        {/* Clean Modern Welcome / Empty State */}
        {messages.length === 0 && (
          <div className="space-y-4 pt-2">
            <div className="p-3.5 bg-[#121217] border border-[#24242C] rounded-lg space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#F2F2F3] font-mono">
                <span className="text-[#C7A46A]">◈</span>
                <span>PHYSICS COPILOT</span>
              </div>
              <p className="text-xs text-[#929298] leading-relaxed">
                Autonomous 3D three-body gravitational assistant. Ask any physics question or control the simulation with natural commands like <strong className="text-[#F2F2F3]">"set triangle and run"</strong>, <strong className="text-[#F2F2F3]">"run"</strong>, or <strong className="text-[#F2F2F3]">"reset"</strong>.
              </p>
            </div>

            <div className="space-y-1.5">
              <div className="text-[10px] text-[#929298] font-mono font-semibold tracking-wider uppercase pl-0.5">
                SUGGESTED INVESTIGATIONS
              </div>
              <div className="grid grid-cols-1 gap-1.5">
                {suggestedPrompts.map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendSafe(q.text)}
                    disabled={loading}
                    className="w-full text-left text-xs text-[#EDEDF0] border border-[#272730] bg-[#141419] hover:bg-[#1B1B22] hover:border-[#C7A46A]/60 px-3 py-2 rounded-md transition-all leading-snug flex items-center justify-between group"
                  >
                    <span>{q.text}</span>
                    <span className="text-[10px] text-[#929298] group-hover:text-[#C7A46A] shrink-0 ml-2 font-mono">
                      ↳
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Message Stream */}
        {messages.map((m, i) => (
          <div
            key={i}
            className={`w-full flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'} group`}
          >
            {m.role === 'user' ? (
              <div className="max-w-[85%] rounded-2xl rounded-tr-xs bg-[#1F1F27] text-[#EDEDF0] border border-[#2E2E3A] px-3.5 py-2 text-xs leading-relaxed break-words shadow-sm">
                {m.content}
              </div>
            ) : (
              <div className="w-full space-y-1">
                {/* Assistant Label & Time */}
                <div className="flex items-center gap-1.5 text-[10px] text-[#929298] font-mono pl-0.5 select-none">
                  <span className="text-[#C7A46A]">◈</span>
                  <span className="font-semibold text-[#C7A46A]">COPILOT</span>
                </div>

                {/* Assistant Bubble */}
                <div className="w-full bg-[#131318] text-[#EDEDF0] border border-[#24242C] p-3 rounded-lg text-xs leading-relaxed shadow-sm">
                  <FormattedMessage
                    content={m.content}
                    onApplyPreset={onApplyPreset}
                    onRunSimulation={onRunSimulation}
                  />
                </div>

                {/* Subdued Message Actions */}
                <div className="flex items-center gap-2 pt-0.5 pl-1 text-[10px] text-[#929298] font-mono select-none">
                  <button
                    onClick={() => handleCopyMessage(m.content, i)}
                    className="hover:text-[#F2F2F3] transition-colors hover:underline"
                    title="Copy response text"
                  >
                    {copiedIndex === i ? '✓ Copied' : 'Copy'}
                  </button>

                  <span>·</span>

                  <button
                    onClick={() => onRegenerate?.(i)}
                    disabled={loading}
                    className="hover:text-[#F2F2F3] transition-colors hover:underline disabled:opacity-40"
                    title="Regenerate answer"
                  >
                    Regenerate
                  </button>

                  <span>·</span>

                  <button
                    onClick={() => handleSendSafe('Can you explain that in simpler, more intuitive terms?')}
                    disabled={loading}
                    className="hover:text-[#C7A46A] transition-colors disabled:opacity-40"
                    title="Explain simply"
                  >
                    Simpler
                  </button>

                  <span>·</span>

                  <button
                    onClick={() => handleSendSafe('Show the exact mathematical derivation and formulas.')}
                    disabled={loading}
                    className="hover:text-[#C7A46A] transition-colors disabled:opacity-40"
                    title="Show math details"
                  >
                    Math
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Floating Jump-to-Bottom Pill */}
        {showScrollBottomBtn && (
          <div className="sticky bottom-1 flex justify-end z-20 pointer-events-none">
            <button
              onClick={() => scrollToBottom(true)}
              className="pointer-events-auto text-[10px] font-mono px-2.5 py-1 rounded-full bg-[#1A1A24] text-[#C7A46A] border border-[#C7A46A]/60 shadow-lg hover:bg-[#222230] transition-all flex items-center gap-1 active:scale-95"
              title="Jump to latest message"
            >
              <span>↓</span>
              <span>Jump to Bottom</span>
            </button>
          </div>
        )}

        {/* Loading Indicator */}
        {loading && (
          <div className="flex items-center gap-2 text-xs text-[#C7A46A] px-3 py-2 bg-[#141419] border border-[#24242C] rounded-md font-mono">
            <span className="w-2 h-2 rounded-full bg-[#C7A46A] animate-ping" />
            <span>THINKING & COMPUTING TELEMETRY…</span>
          </div>
        )}

        {/* Error Banner */}
        {error && (
          <div className="text-xs text-[#EDEDF0] border border-red-500/40 bg-red-950/20 p-3 rounded-md flex flex-col gap-2 break-words font-mono">
            <div className="flex items-center gap-2 text-red-400 font-semibold">
              <span>⚠</span>
              <span>REQUEST NOTICE</span>
            </div>
            <p className="text-[11px] text-[#929298] leading-relaxed">{error}</p>
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={() => onRegenerate?.(messages.length - 1)}
                className="text-[10px] text-[#C7A46A] border border-[#C7A46A]/40 px-2 py-0.5 rounded hover:bg-[#C7A46A]/20 transition-colors"
              >
                Retry
              </button>
              <button
                onClick={onOpenApiKeyModal}
                className="text-[10px] text-[#EDEDF0] underline hover:text-[#C7A46A] transition-colors"
              >
                Configure Groq Key ⚙
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 3. Collapsible Bottom Accessory Drawers (Tucked cleanly at bottom) */}
      {activeBottomDrawer === 'modes' && (
        <div className="p-2.5 bg-[#121217] border-t border-[#24242C] shrink-0 font-mono text-xs">
          <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-[#24242C] text-[10px] text-[#929298]">
            <span>SELECT COPILOT MODE</span>
            <button
              onClick={() => setActiveBottomDrawer(null)}
              className="text-[#929298] hover:text-[#F2F2F3]"
            >
              ✕
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1 max-h-36 overflow-y-auto custom-scrollbar">
            {MODE_DEFINITIONS.map((m) => (
              <button
                key={m.id}
                onClick={() => handleModeChange(m.id)}
                title={m.desc}
                className={`text-[10px] px-2 py-1.5 border rounded text-left transition-colors truncate ${
                  chatMode === m.id
                    ? 'border-[#C7A46A] text-[#F2F2F3] bg-[#C7A46A]/20 font-semibold'
                    : 'border-[#24242C] text-[#929298] hover:text-[#F2F2F3] hover:border-[#3D3D48]'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {activeBottomDrawer === 'telemetry' && (
        <div className="p-3 bg-[#111115] border-t border-[#24242C] shrink-0 font-mono text-[10.5px] text-[#929298] space-y-2 max-h-44 overflow-y-auto custom-scrollbar">
          <div className="flex items-center justify-between text-[#F2F2F3] font-semibold border-b border-[#24242C] pb-1">
            <span className="flex items-center gap-1.5">
              <span className="text-[#C7A46A]">●</span> LIVE TELEMETRY SNAPSHOT
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[#C7A46A] text-[9.5px]">t={timeLabel}s</span>
              <button
                onClick={() => setActiveBottomDrawer(null)}
                className="text-[#929298] hover:text-[#F2F2F3]"
              >
                ✕
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[10px]">
            <div>
              <span className="text-[#EDEDF0] block">Preset: {presetLabel}</span>
              <span>Integrator: {integratorLabel}</span>
            </div>
            <div>
              <span className="text-[#EDEDF0] block">
                Total Energy: {telemetry?.energy?.total?.toFixed(4) || '—'}
              </span>
              <span>
                Energy Drift: {telemetry?.energyError !== undefined ? `${(telemetry.energyError * 100).toFixed(4)}%` : '—'}
              </span>
            </div>
          </div>

          {telemetry?.pairDist && (
            <div className="text-[10px] space-y-0.5 border-t border-[#24242C] pt-1">
              <span className="text-[#EDEDF0] block">Pairwise Distances:</span>
              <div className="grid grid-cols-3 gap-1">
                <span>B1–B2: {telemetry.pairDist.d01?.toFixed(3)}</span>
                <span>B1–B3: {telemetry.pairDist.d02?.toFixed(3)}</span>
                <span>B2–B3: {telemetry.pairDist.d12?.toFixed(3)}</span>
              </div>
            </div>
          )}

          {simState?.chaosOn && (
            <div className="text-[10px] border-t border-[#24242C] pt-1 text-[#C7A46A]">
              <span>Chaos Lab: Separation Δ={telemetry?.chaosSep?.toExponential(3)}</span>
            </div>
          )}
        </div>
      )}

      {activeBottomDrawer === 'prompts' && (
        <div className="p-2.5 bg-[#121217] border-t border-[#24242C] shrink-0 font-mono text-xs space-y-1.5">
          <div className="flex items-center justify-between text-[10px] text-[#929298] pb-1 border-b border-[#24242C]">
            <span>QUICK SCIENTIFIC PROMPTS</span>
            <button
              onClick={() => setActiveBottomDrawer(null)}
              className="text-[#929298] hover:text-[#F2F2F3]"
            >
              ✕
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => {
                onExplain();
                setActiveBottomDrawer(null);
                focusTextarea();
              }}
              disabled={loading}
              className="px-2 py-1 text-[10.5px] border border-[#24242C] hover:border-[#C7A46A] text-[#EDEDF0] rounded transition-colors"
            >
              🔍 Explain Orbit
            </button>
            <button
              onClick={() => {
                handleSendSafe('What critical physical behavior should I observe in this orbit right now?');
                setActiveBottomDrawer(null);
              }}
              disabled={loading}
              className="px-2 py-1 text-[10.5px] border border-[#24242C] hover:border-[#C7A46A] text-[#EDEDF0] rounded transition-colors"
            >
              💡 Observation Guide
            </button>
            <button
              onClick={() => {
                handleSendSafe('Generate a publication-ready scientific brief and telemetry analysis of the current state.');
                setActiveBottomDrawer(null);
              }}
              disabled={loading}
              className="px-2 py-1 text-[10.5px] border border-[#24242C] hover:border-[#C7A46A] text-[#EDEDF0] rounded transition-colors"
            >
              📑 Scientific Brief
            </button>
          </div>
        </div>
      )}

      {/* 4. Sleek Quick Accessory Strip (Right above input) - Responsive Scroll on Mobile */}
      <div className="flex items-center justify-between px-2.5 sm:px-3 py-1.5 bg-[#121216] border-t border-[#24242A] text-[10px] text-[#929298] shrink-0 font-mono overflow-x-auto custom-scrollbar">
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          {/* Mode Selector Pill */}
          <button
            onClick={() => setActiveBottomDrawer((d) => (d === 'modes' ? null : 'modes'))}
            className={`px-2 py-0.5 rounded border transition-colors flex items-center gap-1 whitespace-nowrap ${
              activeBottomDrawer === 'modes'
                ? 'border-[#C7A46A] text-[#C7A46A] bg-[#C7A46A]/10'
                : 'border-[#24242C] hover:text-[#EDEDF0] hover:border-[#3D3D48]'
            }`}
          >
            <span>Mode: {currentModeObj.label}</span>
            <span className="text-[8px]">▾</span>
          </button>

          {/* Telemetry Snapshot Pill */}
          <button
            onClick={() => setActiveBottomDrawer((d) => (d === 'telemetry' ? null : 'telemetry'))}
            className={`px-2 py-0.5 rounded border transition-colors flex items-center gap-1 whitespace-nowrap ${
              activeBottomDrawer === 'telemetry'
                ? 'border-[#C7A46A] text-[#C7A46A] bg-[#C7A46A]/10'
                : 'border-[#24242C] hover:text-[#EDEDF0] hover:border-[#3D3D48]'
            }`}
          >
            <span>📊 Telemetry</span>
            <span className="text-[8px]">▾</span>
          </button>

          {/* Quick Prompts Pill */}
          <button
            onClick={() => setActiveBottomDrawer((d) => (d === 'prompts' ? null : 'prompts'))}
            className={`px-2 py-0.5 rounded border transition-colors flex items-center gap-1 whitespace-nowrap ${
              activeBottomDrawer === 'prompts'
                ? 'border-[#C7A46A] text-[#C7A46A] bg-[#C7A46A]/10'
                : 'border-[#24242C] hover:text-[#EDEDF0] hover:border-[#3D3D48]'
            }`}
          >
            <span>💡 Prompts</span>
            <span className="text-[8px]">▾</span>
          </button>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 ml-2 whitespace-nowrap">
          {/* Narration Toggle */}
          {!narrateActive ? (
            <button
              onClick={onStartNarrate}
              title="Start live speech narration"
              className="text-[#929298] hover:text-[#C7A46A] transition-colors"
            >
              🎙 Narrate
            </button>
          ) : (
            <button
              onClick={onStopNarrate}
              title="Stop voice narration"
              className="text-[#C7A46A] font-semibold animate-pulse transition-colors"
            >
              ■ Stop Voice
            </button>
          )}

          <span>·</span>

          {/* Export */}
          <button
            onClick={onExportChat}
            title="Export conversation history"
            className="hover:text-[#EDEDF0] transition-colors"
          >
            Export
          </button>

          <span>·</span>

          {/* Clear */}
          <button
            onClick={onClearChat}
            title="Clear chat"
            className="hover:text-[#EDEDF0] transition-colors"
          >
            Clear
          </button>
        </div>
      </div>

      {/* 5. Modern Input Composer */}
      <div className="p-2.5 bg-[#0E0E12] border-t border-[#24242A] shrink-0">
        <div className="flex items-end gap-2 bg-[#16161C] border border-[#272732] rounded-lg p-1.5 focus-within:border-[#C7A46A] transition-colors">
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
                ? 'Defend your simulation…'
                : "Ask physics question, or command: 'set triangle and run', 'pause', 'run'…"
            }
            className="flex-1 bg-transparent text-[#EDEDF0] px-2 py-1 text-xs font-sans resize-none focus:outline-none placeholder:text-[#929298]/50 min-h-[28px] max-h-[120px] custom-scrollbar"
          />

          {loading ? (
            <button
              onClick={onCancel}
              title="Stop generation"
              className="px-3 py-1.5 border border-red-500/50 bg-red-950/40 text-red-300 text-xs font-semibold rounded-md hover:bg-red-900/50 transition-colors shrink-0 font-mono flex items-center gap-1"
            >
              ■ STOP
            </button>
          ) : (
            <button
              onClick={() => handleSendSafe()}
              disabled={!input.trim()}
              className="px-3 py-1.5 border border-[#C7A46A]/60 bg-[#C7A46A]/15 text-[#F2F2F3] text-xs font-semibold rounded-md disabled:opacity-30 hover:bg-[#C7A46A]/25 transition-all shrink-0 font-mono flex items-center gap-1 tracking-wider active:scale-95"
            >
              SEND ↵
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
