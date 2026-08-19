import React, { useState } from 'react';

export function Section({ title, children, className = '', collapsible = false, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={`space-y-1.5 ${className}`}>
      <div
        onClick={collapsible ? () => setOpen(!open) : undefined}
        className={`text-[10px] tracking-[0.2em] text-slate-300 font-semibold mb-1 border-b border-white/10 pb-1 flex items-center justify-between select-none ${
          collapsible ? 'cursor-pointer hover:text-cyan-300 transition-colors' : ''
        }`}
      >
        <span>{title}</span>
        {collapsible && (
          <span className="text-slate-400 text-[10px] transform transition-transform duration-200">
            {open ? '▾' : '▸'}
          </span>
        )}
      </div>
      {(!collapsible || open) && <div className="space-y-1.5">{children}</div>}
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
