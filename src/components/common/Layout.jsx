import React from 'react';

export function Section({ title, children, className = '' }) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <div className="text-[10px] tracking-[0.2em] text-slate-400 font-semibold mb-1.5 border-b border-white/10 pb-1 flex items-center justify-between">
        <span>{title}</span>
      </div>
      <div className="space-y-1.5">{children}</div>
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
