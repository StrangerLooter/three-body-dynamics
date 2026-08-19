import React from 'react';

export function MiniInput({ value, onChange, width = 'w-16', className = '' }) {
  return (
    <input
      type="text"
      inputMode="decimal"
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      className={`bg-black/60 border border-white/15 text-cyan-200 px-1.5 py-0.5 text-[10px] font-mono ${width} text-right focus:border-cyan-400 focus:outline-none focus:bg-cyan-950/30 ${className}`}
    />
  );
}

export function RangeSlider({ value, min, max, step, onChange, className = '' }) {
  return (
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className={`accent-cyan-400 cursor-pointer h-1.5 bg-white/10 rounded-lg appearance-none ${className}`}
    />
  );
}
