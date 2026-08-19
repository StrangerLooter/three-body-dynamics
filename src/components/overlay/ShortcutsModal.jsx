import React from 'react';
import { SHORTCUTS } from '../../constants/shortcuts.js';

export function ShortcutsModal({ onClose }) {
  return (
    <div
      className="absolute inset-0 z-40 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 select-none"
      onClick={onClose}
    >
      <div
        className="bg-black/90 border border-white/15 px-6 py-5 max-w-sm w-full font-mono shadow-[0_0_30px_rgba(0,0,0,0.8)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-2">
          <span className="text-xs tracking-[0.2em] text-slate-200 font-semibold">
            KEYBOARD SHORTCUTS
          </span>
          <button
            onClick={onClose}
            aria-label="Close shortcuts"
            className="text-slate-400 hover:text-cyan-300 text-sm p-1 transition-colors"
          >
            ✕
          </button>
        </div>
        <div className="space-y-2">
          {SHORTCUTS.map(([key, desc]) => (
            <div key={key} className="flex items-center justify-between text-xs">
              <span className="text-cyan-300 border border-white/15 px-2 py-0.5 min-w-[3rem] text-center bg-white/5 font-medium">
                {key}
              </span>
              <span className="text-slate-400 text-right">{desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
