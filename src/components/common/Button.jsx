import React from 'react';

export function SmallBtn({ children, onClick, active = false, label, className = '', disabled = false }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label || undefined}
      title={label || undefined}
      className={`px-3 py-1.5 border text-[11px] font-mono tracking-wide transition-all select-none disabled:opacity-40 ${
        active
          ? 'border-cyan-400/80 text-cyan-200 bg-cyan-400/15 font-semibold shadow-[0_0_12px_rgba(111,211,255,0.2)]'
          : 'border-white/20 text-slate-300 hover:border-cyan-400/50 hover:text-cyan-200 hover:bg-white/5'
      } ${className}`}
    >
      {children}
    </button>
  );
}

export function PresetBtn({ children, onClick, active = false, className = '' }) {
  return (
    <button
      onClick={onClick}
      className={`text-left px-2.5 py-1.5 border text-[10px] tracking-wider transition-all select-none ${
        active
          ? 'border-cyan-400/60 text-cyan-200 bg-cyan-400/15 font-medium shadow-[0_0_10px_rgba(111,211,255,0.15)]'
          : 'border-white/10 text-slate-400 hover:border-white/25 hover:text-slate-200 hover:bg-white/5'
      } ${className}`}
    >
      {children}
    </button>
  );
}

export function ActionBtn({ children, onClick, active = false, icon, className = '', disabled = false }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-1.5 px-2.5 py-1 border text-[10px] tracking-wide transition-all disabled:opacity-40 ${
        active
          ? 'border-cyan-400/60 text-cyan-200 bg-cyan-400/10'
          : 'border-white/10 text-slate-400 hover:border-cyan-400/30 hover:text-slate-200'
      } ${className}`}
    >
      {icon && <span>{icon}</span>}
      <span>{children}</span>
    </button>
  );
}
