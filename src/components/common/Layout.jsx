import React, { useState } from 'react';

export function Section({ title, children, className = '', collapsible = false, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={`space-y-1.5 ${className}`}>
      <div
        onClick={collapsible ? () => setOpen(!open) : undefined}
        className={`text-[10px] tracking-[0.2em] font-semibold flex items-center justify-between select-none transition-all duration-200 ${
          collapsible
            ? open
              ? 'px-2 py-1.5 bg-cyan-950/50 border border-cyan-400/60 text-cyan-300 shadow-[0_0_12px_rgba(34,211,238,0.2)] rounded-xs cursor-pointer'
              : 'px-2 py-1.5 bg-black/40 border border-white/10 text-slate-400 hover:text-slate-200 hover:border-white/25 rounded-xs cursor-pointer'
            : 'text-slate-300 border-b border-white/10 pb-1'
        }`}
      >
        <span className="flex items-center gap-1.5">
          {collapsible && (
            <span
              className={`w-1.5 h-1.5 rounded-full transition-colors ${
                open ? 'bg-cyan-400 shadow-[0_0_6px_#22d3ee]' : 'bg-slate-600'
              }`}
            />
          )}
          {title}
        </span>
        {collapsible && (
          <span
            className={`text-xs transform transition-transform duration-200 font-bold ${
              open ? 'text-cyan-300 rotate-0' : 'text-slate-500 -rotate-90'
            }`}
          >
            ▾
          </span>
        )}
      </div>
      {(!collapsible || open) && <div className="space-y-1.5 pt-0.5 px-0.5">{children}</div>}
    </div>
  );
}

export function Row({ label, children, className = '' }) {
  return (
    <div className={`flex items-center justify-between gap-2 text-[11px] ${className}`}>
      <span className="text-slate-400 tracking-wide">{label}</span>
      <div className="flex items-center">{children}</div>
    </div>
  );
}

export function Telemetry({ label, value, color = 'text-slate-100', className = '' }) {
  return (
    <div className={`flex items-center justify-between text-[11px] font-mono ${className}`}>
      <span className="text-slate-400">{label}</span>
      <span className={`${color} tabular-nums font-medium`}>{value}</span>
    </div>
  );
}
