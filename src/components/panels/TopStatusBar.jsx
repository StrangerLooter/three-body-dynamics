import React from 'react';
import { CAMERA_MODES } from '../../constants/cameraModes.js';

export function TopStatusBar({
  simTime,
  running,
  fps,
  dt,
  integrator,
  camMode,
  demoMode,
  isFullscreen,
  chatOpen,
  onToggleDemoMode,
  onTakeScreenshot,
  onToggleFullscreen,
  onToggleHelp,
  onToggleChat,
  onOpenApiKeyModal,
}) {
  const currentCamLabel =
    CAMERA_MODES.find((m) => m.key === camMode)?.label || camMode.toUpperCase();

  return (
    <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 py-2.5 bg-black/40 backdrop-blur-md border-b border-white/10 text-xs text-slate-300 z-20 font-mono select-none">
      {/* Title & Status Indicator */}
      <div className="flex items-center gap-4">
        <span className="tracking-[0.25em] text-slate-100 font-semibold">THREE-BODY DYNAMICS</span>
        <span className="flex items-center gap-1.5 text-[11px]">
          <span
            className={`w-2 h-2 rounded-full ${
              running ? 'bg-cyan-400 animate-pulse shadow-[0_0_8px_#22d3ee]' : 'bg-slate-500'
            }`}
          />
          <span className={running ? 'text-cyan-300 font-medium' : 'text-slate-400'}>
            {running ? 'RUNNING' : 'PAUSED'}
          </span>
        </span>
      </div>

      {/* Telemetry info & Action Buttons */}
      <div className="hidden md:flex items-center gap-5 text-slate-400 text-[11px]">
        <span>
          T = <span className="text-slate-200 tabular-nums">{simTime.toFixed(3)}s</span>
        </span>
        <span>
          FPS <span className="text-slate-200 tabular-nums">{fps}</span>
        </span>
        <span>
          DT <span className="text-slate-200 tabular-nums">{dt.toExponential(1)}</span>
        </span>
        <span className="text-cyan-300/90 font-medium">{integrator.toUpperCase()}</span>
        <span className="text-violet-300/90 font-medium">{currentCamLabel}</span>

        {!demoMode ? (
          <button
            onClick={onToggleDemoMode}
            className="text-slate-400 hover:text-amber-300 tracking-wider transition-colors"
          >
            DEMO MODE
          </button>
        ) : (
          <button
            onClick={onToggleDemoMode}
            className="text-amber-300 font-semibold tracking-wider hover:text-amber-200 animate-pulse transition-colors"
          >
            EXIT DEMO
          </button>
        )}

        <div className="flex items-center gap-3 pl-3 border-l border-white/15">
          <button
            onClick={onTakeScreenshot}
            title="Take high-res screenshot (PNG)"
            aria-label="Take screenshot"
            className="text-slate-400 hover:text-cyan-300 text-sm transition-colors"
          >
            ⌗
          </button>
          <button
            onClick={onToggleFullscreen}
            title="Toggle fullscreen view"
            aria-label="Toggle fullscreen"
            className="text-slate-400 hover:text-cyan-300 text-sm transition-colors"
          >
            {isFullscreen ? '⤡' : '⤢'}
          </button>
          <button
            onClick={onToggleHelp}
            title="Keyboard shortcuts (?)"
            aria-label="Show keyboard shortcuts"
            className="text-slate-400 hover:text-cyan-300 font-bold transition-colors"
          >
            ?
          </button>
          <button
            onClick={onOpenApiKeyModal}
            title="API Key Settings"
            aria-label="API Key Settings"
            className="text-slate-400 hover:text-cyan-300 transition-colors"
          >
            ⚙
          </button>
          <button
            onClick={onToggleChat}
            title="AI Physics Assistant"
            aria-label="Toggle AI assistant"
            className={`transition-colors font-bold ${
              chatOpen ? 'text-cyan-300 shadow-[0_0_8px_rgba(111,211,255,0.5)]' : 'text-slate-400 hover:text-cyan-300'
            }`}
          >
            ◈
          </button>
        </div>
      </div>
    </div>
  );
}
