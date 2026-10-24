import React, { useState, useEffect } from 'react';
import { getStoredApiKey, saveStoredApiKey, AVAILABLE_MODELS } from '../../services/aiService.js';

export function ApiKeyModal({ isOpen, onClose, onKeySaved, currentModel = 'openai/gpt-oss-120b', onModelChange }) {
  const [keyInput, setKeyInput] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [selectedModel, setSelectedModel] = useState(currentModel);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setKeyInput(getStoredApiKey());
      setSelectedModel(currentModel || 'openai/gpt-oss-120b');
      setSavedSuccess(false);
    }
  }, [isOpen, currentModel]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSave = () => {
    saveStoredApiKey(keyInput);
    onKeySaved?.(keyInput);
    if (onModelChange && selectedModel) {
      onModelChange(selectedModel);
    }
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 600);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-[#0B0B0C]/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 select-none font-mono"
      onClick={onClose}
    >
      <div
        className="bg-[#121214] border border-[#29292D] rounded-sm p-4 sm:p-6 max-w-md w-full max-h-[92vh] overflow-y-auto custom-scrollbar shadow-[0_12px_40px_rgba(0,0,0,0.85)] text-[#F2F2F3]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between mb-4 border-b border-[#29292D] pb-3">
          <div className="flex items-center gap-2">
            <span className="text-[#C7A46A] text-sm">◈</span>
            <span className="text-xs tracking-[0.2em] font-semibold text-[#F2F2F3]">
              PHYSICS COPILOT CONFIGURATION
            </span>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="text-[#929298] hover:text-[#F2F2F3] text-sm transition-colors p-1"
          >
            ✕
          </button>
        </div>

        <p className="text-[#929298] text-xs leading-relaxed mb-4">
          Physics Copilot uses the high-speed Groq LPU inference cloud to reason over 3D orbital telemetry, conduct numerical diagnostics, and guide physical intuition. Keys are stored locally in your browser.
        </p>

        {/* API Key Input */}
        <div className="space-y-3.5 mb-5">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[10px] text-[#929298] uppercase tracking-wider">
                Groq API Key
              </label>
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="text-[10px] text-[#929298] hover:text-[#F2F2F3] transition-colors"
              >
                {showKey ? 'Hide' : 'Reveal'}
              </button>
            </div>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                placeholder="gsk_..."
                className="w-full bg-[#18181B] border border-[#29292D] text-[#F2F2F3] px-3 py-2 text-xs font-mono rounded-xs focus:border-[#C7A46A] focus:outline-none transition-colors placeholder:text-[#929298]/40"
              />
            </div>
            <div className="flex items-center justify-between text-[10px] text-[#929298] mt-1.5">
              <span>Free key available at:</span>
              <a
                href="https://console.groq.com/keys"
                target="_blank"
                rel="noreferrer"
                className="text-[#C7A46A] hover:underline"
              >
                console.groq.com/keys ↗
              </a>
            </div>
          </div>

          {/* Model Selection */}
          <div>
            <label className="text-[10px] text-[#929298] uppercase tracking-wider block mb-1.5">
              Reasoning Model Architecture
            </label>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="w-full bg-[#18181B] border border-[#29292D] text-[#F2F2F3] px-3 py-2 text-xs font-mono rounded-xs focus:border-[#C7A46A] focus:outline-none cursor-pointer"
            >
              {AVAILABLE_MODELS.map((m) => (
                <option key={m.id} value={m.id} className="bg-[#121214] text-[#F2F2F3]">
                  {m.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between pt-3 border-t border-[#29292D]">
          <button
            onClick={() => {
              setKeyInput('');
              saveStoredApiKey('');
              onKeySaved?.('');
              onClose();
            }}
            className="px-3 py-1.5 border border-[#29292D] text-[#929298] hover:text-[#F2F2F3] hover:border-[#929298]/40 rounded-xs text-xs transition-colors"
          >
            Clear Key
          </button>

          <div className="flex items-center gap-2">
            {savedSuccess && (
              <span className="text-[#C7A46A] text-xs animate-pulse">✓ Saved</span>
            )}
            <button
              onClick={handleSave}
              className="px-4 py-1.5 border border-[#C7A46A]/60 bg-[#C7A46A]/15 text-[#F2F2F3] hover:bg-[#C7A46A]/25 rounded-xs text-xs font-semibold tracking-wider transition-colors"
            >
              Save Configuration
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
