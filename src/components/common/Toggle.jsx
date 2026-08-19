import React from 'react';
import { Row } from './Layout.jsx';

export function ToggleRow({ label, value, onChange, className = '' }) {
  return (
    <Row label={label} className={className}>
      <button
        onClick={onChange}
        type="button"
        className={`px-2 py-0.5 border text-[10px] font-mono tracking-wider transition-all select-none ${
          value
            ? 'border-cyan-400/70 text-cyan-200 bg-cyan-400/15 font-semibold shadow-[0_0_8px_rgba(111,211,255,0.2)]'
            : 'border-white/15 text-slate-500 hover:text-slate-300'
        }`}
      >
        {value ? 'ON' : 'OFF'}
      </button>
    </Row>
  );
}
