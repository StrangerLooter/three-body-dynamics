import React, { useEffect, useState, useRef } from 'react';

export function WarningCard({
  id,
  level = 'WARNING', // 'CAUTION' | 'WARNING' | 'CRITICAL'
  title = 'CLOSE ENCOUNTER DETECTED',
  bodies = 'Body 1 and Body 2',
  description = 'Timestep automatically reduced to maintain stability.',
  timestamp,
  duration = 8,
  onDismiss,
  style = {},
}) {
  const [timeLeft, setTimeLeft] = useState(duration);
  const [isMinimized, setIsMinimized] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const isDraggingRef = useRef(false);
  const dragStartPos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onDismiss?.(id);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [id, duration, onDismiss]);

  // Dragging handlers so user can manually reposition if preferred
  const handlePointerDown = (e) => {
    // Only drag from header or when minimized
    if (e.target.tagName === 'BUTTON') return;
    isDraggingRef.current = true;
    dragStartPos.current = {
      startX: e.clientX - dragOffset.x,
      startY: e.clientY - dragOffset.y,
    };
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  const handlePointerMove = (e) => {
    if (!isDraggingRef.current) return;
    setDragOffset({
      x: e.clientX - dragStartPos.current.startX,
      y: e.clientY - dragStartPos.current.startY,
    });
  };

  const handlePointerUp = () => {
    isDraggingRef.current = false;
    window.removeEventListener('pointermove', handlePointerMove);
    window.removeEventListener('pointerup', handlePointerUp);
  };

  const progressPercent = Math.max(0, (timeLeft / duration) * 100);

  // Level theme colors
  const isCritical = level === 'CRITICAL';
  const isCaution = level === 'CAUTION';

  const glowColor = isCritical
    ? 'rgba(239, 68, 68, 0.5)'
    : isCaution
    ? 'rgba(245, 158, 11, 0.4)'
    : 'rgba(239, 68, 68, 0.4)';

  const borderColor = isCritical
    ? 'border-red-500'
    : isCaution
    ? 'border-amber-500/80'
    : 'border-red-500/80';

  const textColor = isCritical
    ? 'text-red-400'
    : isCaution
    ? 'text-amber-400'
    : 'text-red-400';

  // Minimized Compact Mode View
  if (isMinimized) {
    return (
      <div
        onPointerDown={handlePointerDown}
        className={`relative flex items-center gap-2.5 bg-[#0c0406]/75 backdrop-blur-md border ${borderColor} rounded-full px-3 py-1 font-mono select-none text-slate-200 shadow-lg cursor-grab active:cursor-grabbing transition-transform duration-100 pointer-events-auto`}
        style={{
          boxShadow: `0 0 16px ${glowColor}`,
          transform: `translate(${dragOffset.x}px, ${dragOffset.y}px)`,
          ...style,
        }}
      >
        <span className="w-2 h-2 rounded-full bg-red-500 animate-ping inline-block" />
        <span className={`text-[10px] font-bold uppercase tracking-wider ${textColor}`}>
          {level}
        </span>
        <span className="text-[10px] text-slate-300 font-medium truncate max-w-[140px]">
          {bodies}
        </span>
        <span className="text-[9px] text-slate-400 font-mono">
          {timeLeft}s
        </span>
        <button
          onClick={() => setIsMinimized(false)}
          title="Expand warning card"
          className="text-[10px] text-cyan-300 hover:text-white px-1 py-0.5 rounded transition-colors"
        >
          [+]
        </button>
        <button
          onClick={() => onDismiss?.(id)}
          title="Dismiss"
          className="text-slate-400 hover:text-white text-xs font-bold pl-1"
        >
          ✕
        </button>
      </div>
    );
  }

  return (
    <div
      className={`relative w-72 sm:w-80 bg-[#0c0406]/75 backdrop-blur-md border ${borderColor} rounded-xs p-3 font-mono select-none text-slate-200 transition-all duration-200 pointer-events-auto shadow-2xl ${
        isCritical ? 'animate-pulse' : ''
      }`}
      style={{
        boxShadow: `0 0 25px ${glowColor}, inset 0 0 15px rgba(239, 68, 68, 0.12)`,
        transform: `translate(${dragOffset.x}px, ${dragOffset.y}px)`,
        ...style,
      }}
    >
      {/* Corner HUD accent notches */}
      <div className="absolute -top-1 -left-1 w-2 h-2 border-t-2 border-l-2 border-red-400" />
      <div className="absolute -top-1 -right-1 w-2 h-2 border-t-2 border-r-2 border-red-400" />
      <div className="absolute -bottom-1 -left-1 w-2 h-2 border-b-2 border-l-2 border-red-400" />
      <div className="absolute -bottom-1 -right-1 w-2 h-2 border-b-2 border-r-2 border-red-400" />

      {/* Header: Draggable Grip, Icon, Level, Minimize, Close */}
      <div
        onPointerDown={handlePointerDown}
        className="flex items-center justify-between pb-2 border-b border-red-500/20 cursor-grab active:cursor-grabbing"
      >
        <div className="flex items-center gap-2">
          {/* Warning Icon */}
          <div className="w-4 h-4 flex items-center justify-center text-xs">
            <svg
              viewBox="0 0 24 24"
              className={`w-4 h-4 ${textColor} fill-current`}
              style={{ filter: `drop-shadow(0 0 4px ${glowColor})` }}
            >
              <path d="M12 2L1 21h22L12 2zm0 3.5L20.2 19H3.8L12 5.5zM11 10v4h2v-4h-2zm0 6v2h2v-2h-2z" />
            </svg>
          </div>
          <span className={`text-[10px] font-bold tracking-widest uppercase ${textColor}`}>
            {level}
          </span>
          <span className="text-[9px] text-slate-500 hidden sm:inline">⋮⋮ DRAG</span>
        </div>

        <div className="flex items-center gap-2 text-[10px] text-slate-400">
          <span className="tabular-nums font-semibold text-[9px]">{timestamp}</span>
          {/* Minimize Button */}
          <button
            onClick={() => setIsMinimized(true)}
            title="Minimize to see full orbits"
            className="text-slate-400 hover:text-cyan-300 transition-colors px-1 text-xs font-bold"
          >
            _
          </button>
          {/* Dismiss Button */}
          <button
            onClick={() => onDismiss?.(id)}
            aria-label="Dismiss warning"
            title="Dismiss warning"
            className="text-slate-400 hover:text-white transition-colors p-0.5 text-xs font-bold"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Body: Title, Target Bodies, Description */}
      <div className="py-2.5 space-y-1">
        <div className="text-xs font-bold tracking-wider text-slate-100 uppercase">
          {title}
        </div>
        <div className="text-[11px] text-slate-300 font-medium">{bodies}</div>
        <div className="text-[10px] text-slate-400 leading-tight pt-1 border-t border-white/5">
          {description}
        </div>
      </div>

      {/* Footer: Audio Waveform & Auto-dismiss Countdown Bar */}
      <div className="flex items-center justify-between pt-2 border-t border-red-500/20 text-[10px]">
        {/* Waveform & sound icon */}
        <div className="flex items-center gap-1.5 text-red-400/80">
          <span className="text-xs">🔊</span>
          {/* Animated SVG HUD waveform */}
          <svg className="w-16 h-3 text-red-500" viewBox="0 0 60 14" fill="none">
            <path
              d="M0 7h10l3-5 4 10 4-10 3 5h8l3-6 4 12 4-12 3 6h17"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="opacity-85"
            />
          </svg>
        </div>

        {/* Progress bar and time text */}
        <div className="flex flex-col items-end gap-1">
          <span className="text-[9px] text-slate-400">
            Auto-dismiss in {timeLeft}s
          </span>
          <div className="w-20 h-1 bg-red-950/80 border border-red-500/30 overflow-hidden rounded-xs">
            <div
              className="h-full bg-red-500 transition-all duration-1000 ease-linear shadow-[0_0_8px_#ef4444]"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
