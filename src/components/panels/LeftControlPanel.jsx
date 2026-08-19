import React from 'react';
import { Section, Row, Telemetry } from '../common/Layout.jsx';
import { SmallBtn, PresetBtn } from '../common/Button.jsx';
import { ToggleRow } from '../common/Toggle.jsx';
import { MiniInput, RangeSlider } from '../common/Inputs.jsx';
import { CAMERA_MODES } from '../../constants/cameraModes.js';
import { BODY_HEX, BODY_NAMES } from '../../constants/bodies.js';

export function LeftControlPanel({
  open,
  running,
  speed,
  integrator,
  G,
  adaptiveOn,
  dtMin,
  dtMax,
  tolerance,
  camMode,
  trailsOn,
  showVectors,
  showCOM,
  showGrid,
  showAxes,
  showLabels,
  showSpacetime,
  showAtmosphere,
  showLagrange,
  audioMuted,
  fieldMode,
  presetKey,
  chaosOn,
  epsilon,
  perturbTarget,
  perturbType,
  chaosInitialSep,
  chaosSep,
  chaosMaxSep,
  chaosLyap,
  masses,
  onTogglePlay,
  onReset,
  onStepOnce,
  onSetSpeed,
  onSetIntegrator,
  onToggleAdaptive,
  onSetAdaptiveParam,
  onSetCamMode,
  onResetCamera,
  onToggleVisualFlag,
  onToggleAudio,
  onSetFieldMode,
  onLoadPreset,
  onSetChaosParam,
  onEnableChaos,
  onDisableChaos,
  onSetMass,
}) {
  return (
    <div
      className={`absolute top-11 left-0 bottom-14 z-20 transition-transform duration-300 select-none font-mono ${
        open ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      <div className="w-68 h-full overflow-y-auto bg-[#02050c]/92 backdrop-blur-md border-r border-white/10 p-3 space-y-4 text-xs text-slate-300 custom-scrollbar">
        {/* SIMULATION */}
        <Section title="SIMULATION">
          <div className="flex gap-1.5">
            <SmallBtn onClick={onTogglePlay} active={running} className="flex-1 text-center">
              {running ? 'PAUSE' : 'PLAY'}
            </SmallBtn>
            <SmallBtn onClick={onReset} className="flex-1 text-center">
              RESET
            </SmallBtn>
            <SmallBtn onClick={onStepOnce} className="flex-1 text-center">
              STEP
            </SmallBtn>
          </div>
          <Row label="SPEED">
            <select
              className="bg-black/80 border border-white/15 text-cyan-200 px-1.5 py-0.5 text-[11px] font-mono w-24 focus:border-cyan-400 focus:outline-none"
              value={speed}
              onChange={(e) => onSetSpeed(parseFloat(e.target.value))}
            >
              {[0.1, 0.25, 0.5, 1, 2, 10, 100].map((v) => (
                <option key={v} value={v}>
                  {v}×
                </option>
              ))}
            </select>
          </Row>
          <ToggleRow label="AUDIO SONIFICATION (M)" value={!audioMuted} onChange={onToggleAudio} />
        </Section>

        {/* PHYSICS */}
        <Section title="PHYSICS & GRAVITY">
          <Row label="INTEGRATOR">
            <select
              className="bg-black/80 border border-white/15 text-cyan-200 px-1.5 py-0.5 text-[11px] font-mono w-24 focus:border-cyan-400 focus:outline-none"
              value={integrator}
              onChange={(e) => onSetIntegrator(e.target.value)}
            >
              <option value="rk4">RK4</option>
              <option value="verlet">VERLET</option>
              <option value="euler">EULER</option>
            </select>
          </Row>
          <Row label="G CONSTANT">
            <span className="text-cyan-200">{Number(G).toFixed(2)}</span>
          </Row>
          <ToggleRow label="ADAPTIVE DT" value={adaptiveOn} onChange={onToggleAdaptive} />
          {adaptiveOn && (
            <div className="pl-2 space-y-1 border-l border-cyan-400/30 ml-1 mt-1">
              <Row label="MIN DT">
                <MiniInput
                  value={dtMin}
                  onChange={(v) => onSetAdaptiveParam('dtMin', parseFloat(v) || 0.0001)}
                />
              </Row>
              <Row label="MAX DT">
                <MiniInput
                  value={dtMax}
                  onChange={(v) => onSetAdaptiveParam('dtMax', parseFloat(v) || 0.01)}
                />
              </Row>
              <Row label="TOLERANCE">
                <MiniInput
                  value={tolerance}
                  onChange={(v) => onSetAdaptiveParam('tolerance', parseFloat(v) || 1e-6)}
                />
              </Row>
            </div>
          )}
          <ToggleRow
            label="LAGRANGE POINTS (L)"
            value={showLagrange}
            onChange={() => onToggleVisualFlag('showLagrange')}
          />
        </Section>

        {/* CAMERA */}
        <Section title="CAMERA">
          <Row label="MODE">
            <select
              className="bg-black/80 border border-white/15 text-cyan-200 px-1.5 py-0.5 text-[11px] font-mono w-36 focus:border-cyan-400 focus:outline-none"
              value={camMode}
              onChange={(e) => onSetCamMode(e.target.value)}
            >
              {CAMERA_MODES.map((m) => (
                <option key={m.key} value={m.key}>
                  {m.label}
                </option>
              ))}
            </select>
          </Row>
          <SmallBtn onClick={onResetCamera} className="w-full text-center mt-1">
            RESET CAMERA
          </SmallBtn>
        </Section>

        {/* VISUALS */}
        <Section title="VISUALS & SHADERS">
          <ToggleRow label="ATMOSPHERIC GLOW" value={showAtmosphere} onChange={() => onToggleVisualFlag('showAtmosphere')} />
          <ToggleRow label="TRAILS (T)" value={trailsOn} onChange={() => onToggleVisualFlag('trailsOn')} />
          <ToggleRow
            label="VELOCITY VECTORS (V)"
            value={showVectors}
            onChange={() => onToggleVisualFlag('showVectors')}
          />
          <ToggleRow
            label="CENTER OF MASS"
            value={showCOM}
            onChange={() => onToggleVisualFlag('showCOM')}
          />
          <ToggleRow
            label="COORDINATE GRID"
            value={showGrid}
            onChange={() => onToggleVisualFlag('showGrid')}
          />
          <ToggleRow label="AXES" value={showAxes} onChange={() => onToggleVisualFlag('showAxes')} />
          <ToggleRow label="LABELS" value={showLabels} onChange={() => onToggleVisualFlag('showLabels')} />
          <ToggleRow
            label="SPACETIME FABRIC"
            value={showSpacetime}
            onChange={() => onToggleVisualFlag('showSpacetime')}
          />
          {showSpacetime && (
            <div className="text-[9px] text-slate-400 leading-tight pt-0.5">
              3D mesh dynamically warps with tension-colored strain gradients in the gravitational potential well.
            </div>
          )}
        </Section>

        {/* GRAVITATIONAL FIELD */}
        <Section title="GRAVITATIONAL FIELD">
          <Row label="MODE">
            <select
              className="bg-black/80 border border-white/15 text-cyan-200 px-1.5 py-0.5 text-[10px] font-mono w-32 focus:border-cyan-400 focus:outline-none"
              value={fieldMode}
              onChange={(e) => onSetFieldMode(e.target.value)}
            >
              <option value="off">OFF</option>
              <option value="lines">FIELD LINES</option>
              <option value="vectors">VECTOR FIELD</option>
              <option value="particles">PARTICLE FLOW</option>
              <option value="potential">POTENTIAL CONTOURS</option>
            </select>
          </Row>
          {fieldMode !== 'off' && (
            <div className="text-[9px] text-slate-400 leading-tight pt-0.5">
              Sampled on a 12×12 midplane grid from active body positions.
            </div>
          )}
        </Section>

        {/* PRESETS */}
        <Section title="PRESETS">
          <div className="flex flex-col gap-1">
            <PresetBtn
              active={presetKey === 'figureEight'}
              onClick={() => onLoadPreset('figureEight')}
            >
              FIGURE-8 ORBIT
            </PresetBtn>
            <PresetBtn
              active={presetKey === 'hierarchical'}
              onClick={() => onLoadPreset('hierarchical')}
            >
              HIERARCHICAL TRIPLE
            </PresetBtn>
            <PresetBtn active={presetKey === 'chaos'} onClick={() => onLoadPreset('chaos')}>
              EQUAL-MASS CHAOS
            </PresetBtn>
            <PresetBtn
              active={presetKey === 'restricted'}
              onClick={() => onLoadPreset('restricted')}
            >
              RESTRICTED THREE-BODY
            </PresetBtn>
          </div>
        </Section>

        {/* CHAOS LAB */}
        <Section title="CHAOS LAB">
          <Row label="EPSILON">
            <MiniInput
              value={epsilon}
              onChange={(v) => onSetChaosParam('epsilon', parseFloat(v) || 1e-6)}
            />
          </Row>
          <Row label="PERTURB">
            <select
              className="bg-black/80 border border-white/15 text-cyan-200 px-1.5 py-0.5 text-[10px] font-mono w-28 focus:border-cyan-400 focus:outline-none"
              value={perturbTarget}
              onChange={(e) => onSetChaosParam('perturbTarget', e.target.value)}
            >
              <option value="all">ALL BODIES</option>
              <option value="0">BODY 01</option>
              <option value="1">BODY 02</option>
              <option value="2">BODY 03</option>
            </select>
          </Row>
          <Row label="TYPE">
            <select
              className="bg-black/80 border border-white/15 text-cyan-200 px-1.5 py-0.5 text-[10px] font-mono w-28 focus:border-cyan-400 focus:outline-none"
              value={perturbType}
              onChange={(e) => onSetChaosParam('perturbType', e.target.value)}
            >
              <option value="position">POSITION</option>
              <option value="velocity">VELOCITY</option>
              <option value="both">BOTH</option>
            </select>
          </Row>
          <div className="flex gap-1.5 pt-1">
            {!chaosOn ? (
              <SmallBtn onClick={onEnableChaos} className="w-full text-center">
                ENABLE LAB
              </SmallBtn>
            ) : (
              <>
                <SmallBtn onClick={onEnableChaos} className="flex-1 text-center">
                  RESET TWIN
                </SmallBtn>
                <SmallBtn onClick={onDisableChaos} active className="flex-1 text-center">
                  DISABLE
                </SmallBtn>
              </>
            )}
          </div>
          {chaosOn && (
            <div className="pt-2 mt-1 space-y-1 border-t border-white/10 text-[10px]">
              <Telemetry
                label="INIT SEP"
                value={chaosInitialSep > 0 ? chaosInitialSep.toExponential(2) : '—'}
              />
              <Telemetry
                label="CURR SEP"
                value={chaosSep > 0 ? chaosSep.toExponential(2) : '—'}
                color="text-amber-300"
              />
              <Telemetry
                label="MAX SEP"
                value={chaosMaxSep > 0 ? chaosMaxSep.toExponential(2) : '—'}
              />
              <Telemetry
                label="λ (LYAPUNOV)"
                value={chaosLyap != null ? chaosLyap.toExponential(2) : '—'}
                color="text-violet-300"
              />
              <div className="text-[9px] text-slate-400 leading-tight pt-0.5">
                White wireframe spheres trace the perturbed twin system.
              </div>
            </div>
          )}
        </Section>

        {/* BODY MASS */}
        <Section title="BODY MASSES">
          {[0, 1, 2].map((i) => (
            <div key={i} className="mb-2">
              <div className="flex items-center justify-between mb-1">
                <span style={{ color: BODY_HEX[i] }} className="font-medium text-[11px]">
                  {BODY_NAMES[i]}
                </span>
                <span className="text-cyan-200 tabular-nums text-[11px]">
                  {masses[i] < 0.01 ? masses[i].toExponential(1) : masses[i].toFixed(2)} M
                </span>
              </div>
              <RangeSlider
                min="0.05"
                max="3"
                step="0.05"
                value={masses[i]}
                onChange={(v) => onSetMass(i, v)}
                className="w-full"
              />
            </div>
          ))}
        </Section>
      </div>
    </div>
  );
}
