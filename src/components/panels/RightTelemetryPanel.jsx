import React from 'react';
import { Section, Row, Telemetry } from '../common/Layout.jsx';
import { SmallBtn } from '../common/Button.jsx';
import { MiniInput } from '../common/Inputs.jsx';
import { BODY_HEX, BODY_NAMES } from '../../constants/bodies.js';

export function RightTelemetryPanel({
  open,
  energy,
  energyError,
  momentumMag,
  angMomentumMag,
  minDist,
  maxDist,
  com,
  pairDist,
  selected,
  masses,
  bodyData,
  editMode,
  editVals,
  onSelectBody,
  onSetEditMode,
  onEditValChange,
  onApplyEditVals,
  onRevertEditVals,
}) {
  const fmt = (n, d = 4) => (Number.isFinite(n) ? n.toFixed(d) : '—');

  return (
    <div
      className={`absolute top-11 right-0 bottom-14 z-20 transition-transform duration-300 select-none font-mono ${
        open ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      <div className="w-64 h-full overflow-y-auto bg-[#02050c]/90 backdrop-blur-md border-l border-white/10 p-3 space-y-4 text-xs text-slate-300 custom-scrollbar">
        {/* CONSERVATION TELEMETRY */}
        <Section title="SYSTEM TELEMETRY">
          <Telemetry label="TOTAL ENERGY" value={fmt(energy.total)} />
          <Telemetry label="KINETIC ENERGY" value={fmt(energy.KE)} color="text-cyan-300" />
          <Telemetry label="POTENTIAL ENERGY" value={fmt(energy.PE)} color="text-violet-300" />
          <Telemetry
            label="ENERGY ERROR"
            value={energyError.toExponential(2)}
            color={energyError > 1e-3 ? 'text-amber-400' : 'text-slate-300'}
          />
          <Telemetry label="|P| MOMENTUM" value={fmt(momentumMag)} />
          <Telemetry label="|L| ANGULAR MOM" value={fmt(angMomentumMag)} />
          <Telemetry label="MIN SEPARATION" value={fmt(minDist, 3)} />
          <Telemetry label="MAX SEPARATION" value={fmt(maxDist, 3)} />
        </Section>

        {/* CENTER OF MASS */}
        <Section title="CENTER OF MASS">
          <Row label="X">
            <span className="text-slate-200 tabular-nums">{fmt(com[0], 4)}</span>
          </Row>
          <Row label="Y">
            <span className="text-slate-200 tabular-nums">{fmt(com[1], 4)}</span>
          </Row>
          <Row label="Z">
            <span className="text-slate-200 tabular-nums">{fmt(com[2], 4)}</span>
          </Row>
        </Section>

        {/* PAIRWISE DISTANCES */}
        <Section title="PAIRWISE DISTANCES">
          <Telemetry
            label={`${BODY_NAMES[0]} ↔ ${BODY_NAMES[1]}`}
            value={fmt(pairDist.d01, 3)}
            color="text-cyan-300"
          />
          <Telemetry
            label={`${BODY_NAMES[0]} ↔ ${BODY_NAMES[2]}`}
            value={fmt(pairDist.d02, 3)}
            color="text-violet-300"
          />
          <Telemetry
            label={`${BODY_NAMES[1]} ↔ ${BODY_NAMES[2]}`}
            value={fmt(pairDist.d12, 3)}
            color="text-amber-300"
          />
        </Section>

        {/* BODY DATA */}
        <Section title="BODY INSPECTOR">
          <div className="flex gap-1 mb-2">
            {[0, 1, 2].map((i) => (
              <button
                key={i}
                onClick={() => onSelectBody(i)}
                className={`flex-1 px-1 py-1 border text-[9px] tracking-wider transition-all ${
                  selected === i
                    ? 'border-white/50 bg-white/10 font-bold'
                    : 'border-white/10 text-slate-500 hover:text-slate-300'
                }`}
                style={selected === i ? { color: BODY_HEX[i] } : {}}
              >
                {BODY_NAMES[i]}
              </button>
            ))}
          </div>
          <Telemetry label="MASS" value={`${masses[selected].toFixed(3)} M`} />
          <Telemetry label="POS X" value={fmt(bodyData.pos[0], 3)} />
          <Telemetry label="POS Y" value={fmt(bodyData.pos[1], 3)} />
          <Telemetry label="POS Z" value={fmt(bodyData.pos[2], 3)} />
          <Telemetry label="VEL X" value={fmt(bodyData.vel[0], 3)} />
          <Telemetry label="VEL Y" value={fmt(bodyData.vel[1], 3)} />
          <Telemetry label="VEL Z" value={fmt(bodyData.vel[2], 3)} />
          <Telemetry label="SPEED" value={fmt(bodyData.speed, 3)} color="text-cyan-300" />
          <Telemetry label="DIST TO NEXT" value={fmt(bodyData.distNext, 3)} />
        </Section>

        {/* DIRECT COORDINATE EDITOR */}
        <Section title="DIRECT COORDINATE EDIT">
          <div className="flex gap-1 mb-2">
            <button
              onClick={() => onSetEditMode('live')}
              className={`flex-1 px-1.5 py-1 border text-[9px] tracking-wide transition-all ${
                editMode === 'live'
                  ? 'border-cyan-400/70 text-cyan-200 bg-cyan-400/15 font-semibold'
                  : 'border-white/10 text-slate-500 hover:text-slate-300'
              }`}
            >
              LIVE STATE
            </button>
            <button
              onClick={() => onSetEditMode('initial')}
              className={`flex-1 px-1.5 py-1 border text-[9px] tracking-wide transition-all ${
                editMode === 'initial'
                  ? 'border-violet-400/70 text-violet-200 bg-violet-400/15 font-semibold'
                  : 'border-white/10 text-slate-500 hover:text-slate-300'
              }`}
            >
              INITIAL COND.
            </button>
          </div>
          <div className="space-y-1 mb-2">
            <div className="text-[9px] text-slate-400">POS (X, Y, Z)</div>
            <div className="grid grid-cols-3 gap-1">
              <MiniInput
                value={editVals.px}
                onChange={(v) => onEditValChange('px', v)}
                width="w-full"
              />
              <MiniInput
                value={editVals.py}
                onChange={(v) => onEditValChange('py', v)}
                width="w-full"
              />
              <MiniInput
                value={editVals.pz}
                onChange={(v) => onEditValChange('pz', v)}
                width="w-full"
              />
            </div>
          </div>
          <div className="space-y-1 mb-2">
            <div className="text-[9px] text-slate-400">VEL (VX, VY, VZ)</div>
            <div className="grid grid-cols-3 gap-1">
              <MiniInput
                value={editVals.vx}
                onChange={(v) => onEditValChange('vx', v)}
                width="w-full"
              />
              <MiniInput
                value={editVals.vy}
                onChange={(v) => onEditValChange('vy', v)}
                width="w-full"
              />
              <MiniInput
                value={editVals.vz}
                onChange={(v) => onEditValChange('vz', v)}
                width="w-full"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <SmallBtn onClick={onApplyEditVals} className="flex-1 text-center">
              APPLY
            </SmallBtn>
            <SmallBtn onClick={onRevertEditVals} className="flex-1 text-center">
              REVERT
            </SmallBtn>
          </div>
          <div className="text-[9px] text-slate-400 leading-tight mt-1">
            Editing {editMode === 'initial' ? 'initial state (applies on Reset)' : 'live running state'}{' '}
            for {BODY_NAMES[selected]}.
          </div>
        </Section>
      </div>
    </div>
  );
}
