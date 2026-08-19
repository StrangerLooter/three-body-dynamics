import React from 'react';
import { SmallBtn } from '../common/Button.jsx';

export function TransportBar({
  running,
  simTime,
  speed,
  analysisOpen,
  onTogglePlay,
  onReset,
  onStepOnce,
  onToggleAnalysis,
}) {
  return (
    <div className="absolute bottom-0 left-0 right-0 z-30 bg-[#040812] border-t-2 border-cyan-400/30 px-4 py-2.5 flex items-center gap-3 text-xs text-slate-200 font-mono shadow-[0_-4px_20px_rgba(0,0,0,0.6)] select-none">
      <SmallBtn onClick={onReset} label="Reset simulation to initial conditions (R)">
        ⟲
      </SmallBtn>
      <SmallBtn
        onClick={onTogglePlay}
        active={running}
        label={running ? 'Pause simulation (Space)' : 'Play simulation (Space)'}
      >
        {running ? '❚❚' : '▶'}
      </SmallBtn>
      <SmallBtn onClick={onStepOnce} label="Step one frame forward">
        ⏭
      </SmallBtn>
      <SmallBtn onClick={onToggleAnalysis} active={analysisOpen} label="Toggle analysis drawer (A)">
        ANALYSIS
      </SmallBtn>

      {/* Progress timeline bar */}
      <div className="flex-1 mx-2 h-[3px] bg-white/10 relative rounded-full overflow-hidden">
        <div
          className="absolute left-0 top-0 bottom-0 bg-cyan-400/80 transition-all"
          style={{ width: `${Math.min(100, (simTime % 20) * 5)}%` }}
        />
      </div>

      <span className="text-slate-300 hidden sm:inline tabular-nums text-[11px]">
        T = {simTime.toFixed(2)}s
      </span>
      <span className="text-cyan-300 hidden sm:inline font-semibold text-[11px] min-w-[2.5rem] text-right">
        {speed}×
      </span>
    </div>
  );
}
