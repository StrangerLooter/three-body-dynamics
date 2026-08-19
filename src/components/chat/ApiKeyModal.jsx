import React, { useState } from 'react';
import { getStoredApiKey, saveStoredApiKey } from '../../services/aiService.js';

export function ApiKeyModal({ isOpen, onClose, onKeySaved }) {
  const [keyInput, setKeyInput] = useState(getStoredApiKey());
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSave = () => {
    saveStoredApiKey(keyInput);
    onKeySaved?.(keyInput);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 800);
  };

  return (
    <div
      className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 select-none font-mono"
      onClick={onClose}
    >
      <div
        className="bg-black/95 border border-white/20 p-6 max-w-md w-full shadow-[0_0_40px_rgba(0,0,0,0.9)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3 border-b border-white/10 pb-2">
          <span className="text-xs tracking-[0.2em] text-slate-200 font-semibold flex items-center gap-2">
            <span className="text-cyan-400">◈</span> GROQ API KEY CONFIGURATION
          </span>
          <button onClick={onClose} className="text-slate-400 hover:text-cyan-300 text-sm">
            ✕
          </button>
        </div>

        <p className="text-slate-400 text-xs leading-relaxed mb-4">
          To enable live AI Physics tutoring, documentary narration, and competition quiz modes, provide a free Groq API key.
          Keys are stored locally in your browser and never sent anywhere else.
        </p>

        <div className="space-y-3 mb-5">
          <div>
            <label className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">
              Groq API Key
            </label>
            <input
              type="password"
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              placeholder="gsk_..."
              className="w-full bg-black/60 border border-white/15 text-slate-200 px-3 py-2 text-xs font-mono focus:border-cyan-400 focus:outline-none"
            />
          </div>
          <div className="flex items-center justify-between text-[10px] text-slate-500">
            <span>Get your free key at:</span>
            <a
              href="https://console.groq.com/keys"
              target="_blank"
              rel="noreferrer"
              className="text-cyan-400 hover:underline"
            >
              console.groq.com/keys ↗
            </a>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <button
            onClick={() => {
              setKeyInput('');
              saveStoredApiKey('');
              onKeySaved?.('');
              onClose();
            }}
            className="px-3 py-1.5 border border-white/10 text-slate-400 hover:text-slate-200 text-xs"
          >
            Clear Key
          </button>

          <div className="flex items-center gap-2">
            {savedSuccess && <span className="text-cyan-400 text-xs animate-pulse">✓ Saved!</span>}
            <button
              onClick={handleSave}
              className="px-4 py-1.5 border border-cyan-400/60 bg-cyan-400/15 text-cyan-200 hover:bg-cyan-400/25 text-xs font-semibold"
            >
              Save Key
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
