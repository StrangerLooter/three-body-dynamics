import React from 'react';
import { BODY_HEX, BODY_NAMES } from '../../constants/bodies.js';
import { MultiLineChart } from './MultiLineChart.jsx';

export const ANALYSIS_TABS = [
  { key: 'energy', label: 'ENERGY' },
  { key: 'phasespace', label: 'PHASE SPACE (x vs vx)' },
  { key: 'momentum', label: 'MOMENTUM' },
  { key: 'angular', label: 'ANGULAR MOMENTUM' },
  { key: 'distances', label: 'DISTANCES' },
  { key: 'error', label: 'NUMERICAL ERROR' },
  { key: 'chaos', label: 'CHAOS LAB' },
];

export function AnalysisDrawer({
  open,
  tab,
  onTab,
  history,
  onExportCSV,
  onExportJSON,
  onClose,
}) {
  const H = history || {};
  let series = [];
  let note = '';
  let tArr = H.t || [];
  let isPhaseSpace = false;

  if (tab === 'energy') {
    series = [
      { name: 'KINETIC', color: BODY_HEX[0], values: H.KE || [] },
      { name: 'POTENTIAL', color: BODY_HEX[1], values: H.PE || [] },
      { name: 'TOTAL', color: '#ffffff', values: H.Etot || [] },
    ];
    note = 'K = ½Σmᵢ|vᵢ|²   U = −GΣ mᵢmⱼ/rᵢⱼ   E = K + U';
  } else if (tab === 'phasespace') {
    isPhaseSpace = true;
    series = [
      { name: `${BODY_NAMES[0]} (x vs vx)`, color: BODY_HEX[0], xValues: H.phase0X || [], yValues: H.phase0Vx || [] },
      { name: `${BODY_NAMES[1]} (x vs vx)`, color: BODY_HEX[1], xValues: H.phase1X || [], yValues: H.phase1Vx || [] },
      { name: `${BODY_NAMES[2]} (x vs vx)`, color: BODY_HEX[2], xValues: H.phase2X || [], yValues: H.phase2Vx || [] },
    ];
    note = 'Phase Space (x, vₓ) trajectory: closed loops = periodic orbits; strange attractors = chaos';
  } else if (tab === 'momentum') {
    series = [{ name: '|P|', color: BODY_HEX[0], values: H.momMag || [] }];
    note = 'P = Σ mᵢvᵢ — conserved for an isolated system';
  } else if (tab === 'angular') {
    series = [{ name: '|L|', color: BODY_HEX[1], values: H.angMag || [] }];
    note = 'L = Σ rᵢ × mᵢvᵢ — conserved under central forces';
  } else if (tab === 'distances') {
    series = [
      { name: `${BODY_NAMES[0]}↔${BODY_NAMES[1]}`, color: BODY_HEX[0], values: H.d01 || [] },
      { name: `${BODY_NAMES[0]}↔${BODY_NAMES[2]}`, color: BODY_HEX[1], values: H.d02 || [] },
      { name: `${BODY_NAMES[1]}↔${BODY_NAMES[2]}`, color: BODY_HEX[2], values: H.d12 || [] },
    ];
    note = 'Pairwise separations — sharp dips indicate close encounters';
  } else if (tab === 'error') {
    series = [{ name: 'ENERGY ERROR', color: '#f0b34d', values: H.err || [] }];
    note = '|E(t) − E₀| / |E₀| — numerical stability metric';
  } else if (tab === 'chaos') {
    series = [{ name: 'SEPARATION |A−B|', color: '#f0b34d', values: H.sep || [] }];
    note = 'Phase space divergence between twin systems A & B (Chaos Lab)';
    tArr = H.chaosT || [];
  }

  const n = isPhaseSpace
    ? series[0]?.xValues?.length || 0
    : series.length && series[0].values ? series[0].values.length : 0;
  const last = (arr) => (arr && arr.length ? arr[arr.length - 1] : 0);

  return (
    <div
      className={`absolute left-0 right-0 bottom-14 z-[25] h-64 bg-[#060d1a]/95 backdrop-blur-md border-t-2 border-cyan-400/25 transition-transform duration-300 font-mono shadow-[0_-10px_30px_rgba(0,0,0,0.7)] ${
        open ? 'translate-y-0' : 'translate-y-[115%]'
      }`}
    >
      {/* Top bar with tabs and exports */}
      <div className="flex items-center gap-1.5 px-3 pt-2 pb-1.5 overflow-x-auto text-[10px] border-b border-white/10">
        {ANALYSIS_TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => onTab(t.key)}
            className={`px-2.5 py-1 border whitespace-nowrap tracking-wider transition-colors ${
              tab === t.key
                ? 'border-cyan-400/60 text-cyan-200 bg-cyan-400/15 font-semibold'
                : 'border-white/10 text-slate-400 hover:text-slate-200 hover:border-white/20'
            }`}
          >
            {t.label}
          </button>
        ))}

        <div className="ml-auto flex items-center gap-2 pl-2">
          <span className="text-slate-500 text-[10px] hidden md:inline">{n} SAMPLES</span>
          <button
            onClick={onExportCSV}
            title="Download CSV dataset"
            className="px-2 py-0.5 border border-white/15 text-slate-300 hover:text-cyan-300 hover:border-cyan-400/40 text-[10px] tracking-wide"
          >
            CSV
          </button>
          <button
            onClick={onExportJSON}
            title="Download JSON dataset"
            className="px-2 py-0.5 border border-white/15 text-slate-300 hover:text-cyan-300 hover:border-cyan-400/40 text-[10px] tracking-wide"
          >
            JSON
          </button>
          {onClose && (
            <button
              onClick={onClose}
              aria-label="Close analysis drawer"
              className="text-slate-500 hover:text-cyan-300 px-1 text-xs"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Chart Canvas Viewport */}
      <div className="px-3 py-1 h-36">
        {n < 2 ? (
          <div className="h-full flex items-center justify-center text-slate-500 text-xs">
            {tab === 'chaos'
              ? 'Enable Chaos Lab and run the simulation to track phase-space divergence.'
              : 'Run the simulation to record telemetry data.'}
          </div>
        ) : (
          <MultiLineChart series={series} tArr={tArr} isPhaseSpace={isPhaseSpace} />
        )}
      </div>

      {/* Series legends and physics notes */}
      <div className="px-3 py-1 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-[10px] text-slate-400 border-t border-white/5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {series.map((s) => (
            <span key={s.name} className="flex items-center gap-1.5">
              <span className="w-2 h-2 inline-block rounded-xs" style={{ background: s.color }} />
              <span className="text-slate-400">{s.name}:</span>
              <span className="text-slate-200 tabular-nums">
                {isPhaseSpace
                  ? `${last(s.xValues || []).toFixed(2)}, ${last(s.yValues || []).toFixed(2)}`
                  : Number.isFinite(last(s.values))
                  ? last(s.values).toExponential(3)
                  : '—'}
              </span>
            </span>
          ))}
        </div>
        <span className="text-slate-500 text-[10px] italic hidden lg:inline">{note}</span>
      </div>
    </div>
  );
}
