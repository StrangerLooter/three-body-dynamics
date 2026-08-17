import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';

/* ============================================================================
   PHYSICS LAYER — pure math, zero Three.js / React dependency.
   Mirrors: physics/Vector3Math.ts, Gravity.ts, Integrators/*, Conservation.ts
   ============================================================================ */

const SOFTENING = 1e-4; // epsilon^2 term — prevents division-by-zero singularities

const vAdd = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const vSub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const vScale = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const vDot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const vLen = (a) => Math.sqrt(vDot(a, a));
const vCross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];

// Newtonian mutual gravitation: a_i = G * sum_j!=i  m_j * (r_j - r_i) / |r_j - r_i|^3
function computeAccelerations(positions, masses, G) {
  const n = positions.length;
  const acc = positions.map(() => [0, 0, 0]);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) continue;
      const d = vSub(positions[j], positions[i]);
      const distSq = vDot(d, d) + SOFTENING;
      const dist = Math.sqrt(distSq);
      const factor = (G * masses[j]) / (distSq * dist);
      acc[i] = vAdd(acc[i], vScale(d, factor));
    }
  }
  return acc;
}

function derivative(state, masses, G) {
  const acc = computeAccelerations(state.pos, masses, G);
  return { pos: state.vel.map((v) => v), vel: acc };
}

// Field.ts — gravitational field sampled at an arbitrary point (not a body),
// used by the field-visualization layer. Same softened Newtonian law.
function computeFieldAt(point, positions, masses, G) {
  let acc = [0, 0, 0];
  for (let j = 0; j < positions.length; j++) {
    const d = vSub(positions[j], point);
    const distSq = vDot(d, d) + SOFTENING;
    const dist = Math.sqrt(distSq);
    const factor = (G * masses[j]) / (distSq * dist);
    acc = vAdd(acc, vScale(d, factor));
  }
  return acc;
}

function computePotentialAt(point, positions, masses, G) {
  let u = 0;
  for (let j = 0; j < positions.length; j++) {
    const d = vSub(positions[j], point);
    const dist = Math.sqrt(vDot(d, d) + SOFTENING);
    u -= (G * masses[j]) / dist;
  }
  return u;
}

function stateAdd(s1, s2, scale) {
  return {
    pos: s1.pos.map((p, i) => vAdd(p, vScale(s2.pos[i], scale))),
    vel: s1.vel.map((v, i) => vAdd(v, vScale(s2.vel[i], scale))),
  };
}

// ---- Integrators/Euler.ts ----
function stepEuler(state, masses, G, dt) {
  const d = derivative(state, masses, G);
  return stateAdd(state, d, dt);
}

// ---- Integrators/Verlet.ts (velocity Verlet) ----
function stepVelocityVerlet(state, masses, G, dt) {
  const acc0 = computeAccelerations(state.pos, masses, G);
  const pos = state.pos.map((p, i) =>
    vAdd(vAdd(p, vScale(state.vel[i], dt)), vScale(acc0[i], 0.5 * dt * dt))
  );
  const acc1 = computeAccelerations(pos, masses, G);
  const vel = state.vel.map((v, i) => vAdd(v, vScale(vAdd(acc0[i], acc1[i]), 0.5 * dt)));
  return { pos, vel };
}

// ---- Integrators/RK4.ts (default) ----
function stepRK4(state, masses, G, dt) {
  const k1 = derivative(state, masses, G);
  const k2 = derivative(stateAdd(state, k1, dt / 2), masses, G);
  const k3 = derivative(stateAdd(state, k2, dt / 2), masses, G);
  const k4 = derivative(stateAdd(state, k3, dt), masses, G);

  const combine = (arr) =>
    state.pos.map((_, i) =>
      vScale(
        vAdd(vAdd(arr.k1[i], vScale(arr.k2[i], 2)), vAdd(vScale(arr.k3[i], 2), arr.k4[i])),
        dt / 6
      )
    );

  const dPos = combine({ k1: k1.pos, k2: k2.pos, k3: k3.pos, k4: k4.pos });
  const dVel = combine({ k1: k1.vel, k2: k2.vel, k3: k3.vel, k4: k4.vel });

  return {
    pos: state.pos.map((p, i) => vAdd(p, dPos[i])),
    vel: state.vel.map((v, i) => vAdd(v, dVel[i])),
  };
}

function integrateStep(state, masses, G, dt, method) {
  if (method === 'euler') return stepEuler(state, masses, G, dt);
  if (method === 'verlet') return stepVelocityVerlet(state, masses, G, dt);
  return stepRK4(state, masses, G, dt);
}

// ---- Integrators/RK45.ts — adaptive step via step-doubling on RK4 ----
// Not a true embedded RK45 (Cash-Karp etc.), but a standard, numerically
// sound way to get an error estimate and adapt dt from an existing RK4 core.
function stepDoubling(state, masses, G, dt) {
  const full = stepRK4(state, masses, G, dt);
  const halfA = stepRK4(state, masses, G, dt / 2);
  const halfB = stepRK4(halfA, masses, G, dt / 2);
  let errSq = 0;
  for (let i = 0; i < state.pos.length; i++) {
    const d = vSub(halfB.pos[i], full.pos[i]);
    errSq += vDot(d, d);
  }
  return { result: halfB, err: Math.sqrt(errSq) };
}

// ---- Conservation.ts ----
function computeEnergy(state, masses, G) {
  let KE = 0;
  for (let i = 0; i < masses.length; i++) KE += 0.5 * masses[i] * vDot(state.vel[i], state.vel[i]);
  let PE = 0;
  for (let i = 0; i < masses.length; i++) {
    for (let j = i + 1; j < masses.length; j++) {
      const d = vSub(state.pos[j], state.pos[i]);
      const dist = Math.sqrt(vDot(d, d) + SOFTENING);
      PE -= (G * masses[i] * masses[j]) / dist;
    }
  }
  return { KE, PE, total: KE + PE };
}

function computeMomentum(state, masses) {
  let p = [0, 0, 0];
  for (let i = 0; i < masses.length; i++) p = vAdd(p, vScale(state.vel[i], masses[i]));
  return p;
}

function computeAngularMomentum(state, masses) {
  let L = [0, 0, 0];
  for (let i = 0; i < masses.length; i++) L = vAdd(L, vScale(vCross(state.pos[i], state.vel[i]), masses[i]));
  return L;
}

function computeCOM(state, masses) {
  let com = [0, 0, 0];
  let M = 0;
  for (let i = 0; i < masses.length; i++) {
    com = vAdd(com, vScale(state.pos[i], masses[i]));
    M += masses[i];
  }
  return vScale(com, 1 / M);
}

function minPairDistance(state) {
  let min = Infinity;
  for (let i = 0; i < state.pos.length; i++) {
    for (let j = i + 1; j < state.pos.length; j++) {
      const d = vLen(vSub(state.pos[j], state.pos[i]));
      if (d < min) min = d;
    }
  }
  return min;
}

// ---- Chaos.ts ----
// Phase-space-flavored divergence metric between two twin systems: the
// Euclidean distance summed across each body's position, stacked into one
// scalar. Used to track sensitivity to initial conditions (Chaos Lab).
function computeSeparation(stateA, stateB) {
  let sumSq = 0;
  for (let i = 0; i < stateA.pos.length; i++) {
    const d = vSub(stateA.pos[i], stateB.pos[i]);
    sumSq += vDot(d, d);
  }
  return Math.sqrt(sumSq);
}

// Returns { min, max, pairs: {d01,d02,d12} } — the full pairwise-distance
// picture used by the telemetry panel (spec §16/§17/§20: "pairwise distances").
function computePairDistances(state) {
  const d01 = vLen(vSub(state.pos[1], state.pos[0]));
  const d02 = vLen(vSub(state.pos[2], state.pos[0]));
  const d12 = vLen(vSub(state.pos[2], state.pos[1]));
  return {
    min: Math.min(d01, d02, d12),
    max: Math.max(d01, d02, d12),
    pairs: { d01, d02, d12 },
  };
}

// ---- Presets.ts ----
// Chenciner–Montgomery figure-eight choreography — a validated periodic
// three-equal-mass solution, nudged with a small z-velocity so the default
// scene reads as genuinely 3D rather than a flat orbit.
function presetFigureEight() {
  const p1 = [0.97000436, -0.24308753, 0];
  const p2 = [-0.97000436, 0.24308753, 0];
  const p3 = [0, 0, 0];
  const v3 = [-0.93240737, -0.86473146, 0.015];
  const v1 = vScale(v3, -0.5);
  const v2 = vScale(v3, -0.5);
  return {
    name: 'FIGURE-8 ORBIT',
    masses: [1, 1, 1],
    state: { pos: [p1, p2, p3], vel: [v1, v2, v3] },
  };
}

function presetHierarchicalTriple() {
  return {
    name: 'HIERARCHICAL TRIPLE',
    masses: [1.6, 1.0, 0.25],
    state: {
      pos: [
        [-0.3, 0, 0],
        [0.3, 0, 0],
        [2.4, 0.4, 0.6],
      ],
      vel: [
        [0, -0.55, 0],
        [0, 0.9, 0],
        [-0.1, 0.42, 0.02],
      ],
    },
  };
}

function presetUnstableChaos() {
  return {
    name: 'EQUAL-MASS CHAOS',
    masses: [1, 1, 1],
    state: {
      pos: [
        [1, 0, 0.2],
        [-0.5, 0.87, -0.15],
        [-0.5, -0.87, 0.1],
      ],
      vel: [
        [0, 0.6, 0.05],
        [-0.52, -0.3, 0],
        [0.52, -0.3, -0.05],
      ],
    },
  };
}

// Restricted three-body regime: m3 << m1, m2. Body 03 behaves approximately
// like a test particle orbiting an equal-mass binary — the classical setup
// used as a stepping stone toward Lagrange-point analysis (spec §25).
function presetRestrictedThreeBody() {
  return {
    name: 'RESTRICTED THREE-BODY',
    masses: [1, 1, 0.001],
    state: {
      pos: [
        [-0.5, 0, 0],
        [0.5, 0, 0],
        [0, 2.2, 0.3],
      ],
      vel: [
        [0, -0.7, 0],
        [0, 0.7, 0],
        [-0.35, 0, 0.015],
      ],
    },
  };
}

const PRESETS = {
  figureEight: presetFigureEight,
  hierarchical: presetHierarchicalTriple,
  chaos: presetUnstableChaos,
  restricted: presetRestrictedThreeBody,
};

/* ============================================================================
   THREE LAYER — scene / bodies / trails / starfield / camera
   ============================================================================ */

const BODY_COLORS = [0x6fd3ff, 0xb98cff, 0xffcf7a]; // cyan, violet, amber — UI accent only
const BODY_HEX = ['#6fd3ff', '#b98cff', '#ffcf7a'];
const BODY_NAMES = ['BODY 01', 'BODY 02', 'BODY 03'];
// Real planetary imagery mapped onto each body's sphere — Earth/Pluto/Venus chosen to
// roughly match each body's UI accent color (blue↔cyan, icy↔violet, amber↔amber).
const BODY_TEXTURES = ['https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_atmos_2048.jpg', 'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/moon_1024.jpg', 'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_atmos_2048.jpg'];
const BODY_ROT_SPEED = [0.12, 0.05, 0.03]; // rad/s, independent of orbital motion
const TRAIL_LENGTH = 600;

function buildStarfield() {
  const layers = new THREE.Group();
  const specs = [
    { count: 2200, radius: 60, size: 0.09, color: 0x6f7f9f, opacity: 0.55 },
    { count: 1200, radius: 40, size: 0.13, color: 0x9fb3d9, opacity: 0.8 },
    { count: 400, radius: 25, size: 0.19, color: 0xe8eefc, opacity: 1.0 },
  ];
  specs.forEach((s) => {
    const positions = new Float32Array(s.count * 3);
    for (let i = 0; i < s.count; i++) {
      const r = s.radius * (0.4 + 0.6 * Math.random());
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: s.color,
      size: s.size,
      transparent: true,
      opacity: s.opacity,
      sizeAttenuation: true,
      depthWrite: false,
    });
    layers.add(new THREE.Points(geo, mat));
  });
  return layers;
}

const CAMERA_MODES = [
  { key: 'free', label: 'FREE' },
  { key: 'body0', label: 'FOLLOW BODY 01' },
  { key: 'body1', label: 'FOLLOW BODY 02' },
  { key: 'body2', label: 'FOLLOW BODY 03' },
  { key: 'com', label: 'FOLLOW COM' },
  { key: 'top', label: 'TOP VIEW' },
  { key: 'front', label: 'FRONT VIEW' },
  { key: 'side', label: 'SIDE VIEW' },
  { key: 'auto', label: 'AUTO ORBIT' },
];

// ---- Data export (Phase 8, spec §36) ----
// Column list for the scientific CSV/JSON export — full per-body kinematics,
// not just summary telemetry, so the export is actually reusable outside the app.
const EXPORT_KEYS = [
  't',
  'p0x', 'p0y', 'p0z', 'p1x', 'p1y', 'p1z', 'p2x', 'p2y', 'p2z',
  'v0x', 'v0y', 'v0z', 'v1x', 'v1y', 'v1z', 'v2x', 'v2y', 'v2z',
  'a0x', 'a0y', 'a0z', 'a1x', 'a1y', 'a1z', 'a2x', 'a2y', 'a2z',
  'KE', 'PE', 'Etot',
  'Px', 'Py', 'Pz', 'Lx', 'Ly', 'Lz',
  'comx', 'comy', 'comz',
  'd01', 'd02', 'd12',
];

function makeEmptyHistory() {
  const H = { t: [], chaosT: [], sep: [], err: [], momMag: [], angMag: [] };
  EXPORT_KEYS.forEach((k) => { if (k !== 't') H[k] = []; });
  return H;
}

function buildExportCSV(H) {
  const n = H.t.length;
  const lines = [EXPORT_KEYS.join(',')];
  for (let i = 0; i < n; i++) {
    lines.push(EXPORT_KEYS.map((k) => (H[k] && H[k][i] !== undefined ? H[k][i] : '')).join(','));
  }
  return lines.join('\n');
}

function buildExportJSON(H) {
  const n = H.t.length;
  const rows = [];
  for (let i = 0; i < n; i++) {
    const row = {};
    EXPORT_KEYS.forEach((k) => { row[k] = H[k] ? H[k][i] : null; });
    rows.push(row);
  }
  return JSON.stringify(rows, null, 1);
}

function downloadTextFile(content, filename, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* ============================================================================
   REACT COMPONENT
   ============================================================================ */

export default function ThreeBodySimulator() {
  const [entered, setEntered] = useState(false);

  const mountRef = useRef(null);
  const rootRef = useRef(null);
  const rendererRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const bodyMeshesRef = useRef([]);
  const bodyMeshesBRef = useRef([]); // Chaos Lab "ghost" twin (system B)
  const trailLinesRef = useRef([]);
  const trailBuffersRef = useRef([]); // { arr: Float32Array, count }
  const comMarkerRef = useRef(null);
  const gridRef = useRef(null);
  const spacetimeGridRef = useRef(null);
  const axesHelperRef = useRef(null);
  const arrowsRef = useRef([]);
  const labelRefs = useRef([]);
  const raycasterRef = useRef(new THREE.Raycaster());
  const sysBRef = useRef(null); // { state, initialState } — Chaos Lab twin system
  // Gravitational field visualization objects — built once, toggled by mode
  const fieldLinesRef = useRef(null);
  const fieldVectorsRef = useRef(null);
  const fieldPotentialRef = useRef(null);
  const fieldParticlesRef = useRef(null);
  const fieldParticleDataRef = useRef([]); // plain JS velocity/lifetime state, parallel to the Points buffer
  // Rolling history buffer for the Analysis panel — plain arrays, capped length,
  // sampled at the same ~10Hz cadence as the telemetry sync. Lives outside React
  // state so pushing to it every tick doesn't trigger a re-render.
  const historyRef = useRef(makeEmptyHistory());
  const analysisOpenRef = useRef(false);

  // Camera orbit state (manual — no OrbitControls import available in this sandbox)
  // mode: 'free' | 'body0' | 'body1' | 'body2' | 'com' | 'top' | 'front' | 'side' | 'auto'
  const camStateRef = useRef({
    theta: 0.9,
    phi: 1.15,
    dist: 6.5,
    target: new THREE.Vector3(0, 0, 0),
    desiredTarget: new THREE.Vector3(0, 0, 0),
    mode: 'free',
  });
  const dragRef = useRef({ dragging: false, panning: false, lastX: 0, lastY: 0, moved: 0 });
  const clickRef = useRef({ time: 0, index: -1 });

  // Simulation state (mutable, lives in a ref — physics runs outside React)
  const simRef = useRef(null);
  function makeSim(presetKey = 'figureEight') {
    const preset = PRESETS[presetKey]();
    return {
      presetKey,
      masses: [...preset.masses],
      radii: [0.16, 0.13, 0.1],
      state: JSON.parse(JSON.stringify(preset.state)),
      initialState: JSON.parse(JSON.stringify(preset.state)),
      G: 1,
      dt: 0.006,
      integrator: 'rk4',
      speed: 1,
      running: false,
      simTime: 0,
      initialEnergy: null,
      trailsOn: true,
      showVectors: false,
      showCOM: true,
      showGrid: true,
      showAxes: false,
      showLabels: false,
      showSpacetime: false,
      adaptiveOn: false,
      dtMin: 0.0005,
      dtMax: 0.02,
      tolerance: 1e-6,
      selected: 0,
      chaosOn: false,
      epsilon: 1e-6,
      perturbTarget: 'all', // 'all' | '0' | '1' | '2'
      perturbType: 'position', // 'position' | 'velocity' | 'both'
      chaosInitialSep: 0,
      chaosMaxSep: 0,
      chaosT0: 0,
      fieldMode: 'off', // 'off' | 'lines' | 'vectors' | 'particles' | 'potential'
    };
  }
  if (simRef.current === null) simRef.current = makeSim();

  // UI-facing state, throttled — NOT updated every physics tick
  const [ui, setUi] = useState({
    running: false,
    integrator: 'rk4',
    speed: 1,
    simTime: 0,
    fps: 0,
    dt: 0.006,
    energy: { KE: 0, PE: 0, total: 0 },
    energyError: 0,
    momentumMag: 0,
    angMomentumMag: 0,
    com: [0, 0, 0],
    minDist: 0,
    maxDist: 0,
    pairDist: { d01: 0, d02: 0, d12: 0 },
    selected: 0,
    masses: [1, 1, 1],
    presetKey: 'figureEight',
    warning: null,
    panelLeft: true,
    panelRight: true,
    camMode: 'free',
    trailsOn: true,
    showVectors: false,
    showCOM: true,
    showGrid: true,
    showAxes: false,
    showLabels: false,
    showSpacetime: false,
    adaptiveOn: false,
    dtMin: 0.0005,
    dtMax: 0.02,
    tolerance: 1e-6,
    editMode: 'live', // 'live' | 'initial'
    bodyData: { pos: [0, 0, 0], vel: [0, 0, 0], speed: 0, distNext: 0 },
    analysisOpen: false,
    analysisTab: 'energy', // 'energy' | 'momentum' | 'angular' | 'distances' | 'error' | 'chaos'
    chaosOn: false,
    epsilon: 1e-6,
    perturbTarget: 'all',
    perturbType: 'position',
    chaosInitialSep: 0,
    chaosSep: 0,
    chaosMaxSep: 0,
    chaosLyap: null,
    fieldMode: 'off',
    demoMode: false,
    webglError: false,
    isFullscreen: false,
    helpOpen: false,
  });

  const [editVals, setEditVals] = useState({ px: '0', py: '0', pz: '0', vx: '0', vy: '0', vz: '0' });
  const [chartTick, setChartTick] = useState(0);

  /* ---------------- AI Assistant (Groq) ---------------- */
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState(null);
  const [chatMode, setChatMode] = useState('normal'); // 'normal' | 'narrate' | 'quiz' | 'judge'
  const [narrateTimer, setNarrateTimer] = useState(null);
  const [quizActive, setQuizActive] = useState(false);
  const [groqKey, setGroqKey] = useState('');
  const [groqModel] = useState('openai/gpt-oss-120b');
  const chatScrollRef = useRef(null);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem('groq_api_key');
      const defaultKey = import.meta.env.VITE_GROQ_KEY ||
        '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';
      setGroqKey(saved || defaultKey);
    } catch (e) {
      setGroqKey('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');
    }
  }, []);

  const saveGroqKey = (v) => {
    setGroqKey(v);
    try { window.localStorage.setItem('groq_api_key', v); } catch (e) {}
  };

  useEffect(() => {
    if (chatScrollRef.current) chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
  }, [chatMessages, chatLoading]);

  const buildSimSnapshot = () => {
    const s = simRef.current;
    const energy = computeEnergy(s.state, s.masses, s.G);
    const p = computeMomentum(s.state, s.masses);
    const L = computeAngularMomentum(s.state, s.masses);
    const com = computeCOM(s.state, s.masses);
    const dist = computePairDistances(s.state);
    const bodiesDesc = [0, 1, 2]
      .map((i) => `Body ${i + 1} (mass ${s.masses[i].toFixed(3)}): pos=(${s.state.pos[i].map((v) => v.toFixed(3)).join(', ')}) vel=(${s.state.vel[i].map((v) => v.toFixed(3)).join(', ')})`)
      .join('\n');
    let chaosLine = `Chaos Lab: ${s.chaosOn ? 'ON' : 'OFF'}`;
    if (s.chaosOn && sysBRef.current) {
      chaosLine += `, divergence=${computeSeparation(s.state, sysBRef.current.state).toExponential(3)}, initial=${s.chaosInitialSep.toExponential(3)}`;
    }
    return [
      `Preset: ${s.presetKey} | Integrator: ${s.integrator.toUpperCase()} | dt=${s.dt.toExponential(2)} | G=${s.G} | T=${s.simTime.toFixed(3)}s | Running=${s.running}`,
      bodiesDesc,
      `KE=${energy.KE.toFixed(4)} | PE=${energy.PE.toFixed(4)} | E_total=${energy.total.toFixed(4)}`,
      `|P|=${vLen(p).toFixed(4)} | |L|=${vLen(L).toFixed(4)}`,
      `COM=(${com.map((v) => v.toFixed(3)).join(', ')})`,
      `Distances: B1-B2=${dist.pairs.d01.toFixed(3)} | B1-B3=${dist.pairs.d02.toFixed(3)} | B2-B3=${dist.pairs.d12.toFixed(3)}`,
      chaosLine,
    ].join('\n');
  };

  const SYSTEM_PROMPTS = {
    normal:
      'You are an AI physics tutor inside a live 3D Three-Body Problem simulator (Newtonian gravity, RK4/Verlet/Euler integrators, Chaos Lab, gravitational field viz). ' +
      'Answer questions about orbital mechanics, gravity, conservation laws, numerical integration, and chaos theory. ' +
      'Use the live simulation data when relevant. Keep answers concise. Use plain-text math (^, *, sqrt()).\n\nCURRENT SIMULATION STATE:\n',
    narrate:
      'You are a live science narrator for a 3D Three-Body Problem simulator. ' +
      'Describe what is CURRENTLY happening in 2-3 vivid, engaging sentences — like a nature documentary voiceover. ' +
      'Mention specific values (energy, distances, speeds) from the data. Be dramatic but scientifically accurate.\n\nCURRENT SIMULATION STATE:\n',
    quiz:
      'You are a physics quiz master for a Three-Body Problem simulator. ' +
      'Ask ONE short multiple-choice question (A/B/C/D) based on what is currently happening in the simulation. ' +
      'Make it educational and directly connected to the live data shown. After asking, wait for the user\'s answer.\n\nCURRENT SIMULATION STATE:\n',
    judge:
      'You are a tough but fair physics professor judging a student\'s Three-Body Problem simulator at a college model competition. ' +
      'Ask ONE probing question about the physics, numerical methods, or implementation to test the student\'s depth of understanding. ' +
      'Be specific, reference the current simulation state, and vary between easy and hard questions.\n\nCURRENT SIMULATION STATE:\n',
  };

  const groqCall = async (messages, mode = 'normal') => {
    const systemPrompt = (SYSTEM_PROMPTS[mode] || SYSTEM_PROMPTS.normal) + buildSimSnapshot();
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${groqKey}` },
      body: JSON.stringify({
        model: groqModel,
        messages: [{ role: 'system', content: systemPrompt }, ...messages.slice(-12)],
        temperature: mode === 'narrate' ? 0.75 : 0.4,
        max_tokens: mode === 'narrate' ? 200 : 700,
      }),
    });
    if (!res.ok) throw new Error(`Groq ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const data = await res.json();
    return data.choices?.[0]?.message?.content || '(empty response)';
  };

  const sendChatMessage = async (overrideText) => {
    const text = (overrideText || chatInput).trim();
    if (!text || chatLoading) return;
    const userMsg = { role: 'user', content: text };
    const nextMessages = [...chatMessages, userMsg];
    setChatMessages(nextMessages);
    setChatInput('');
    setChatLoading(true);
    setChatError(null);
    try {
      // Simulation control commands
      const lower = text.toLowerCase();
      let simControlReply = null;
      if (lower.includes('pause') || lower.includes('stop')) {
        simRef.current.running = false;
        setUi((p) => ({ ...p, running: false }));
        simControlReply = '⏸ Simulation paused.';
      } else if (lower.includes('play') || lower.includes('start') || lower.includes('resume')) {
        simRef.current.running = true;
        setUi((p) => ({ ...p, running: true }));
        simControlReply = '▶ Simulation running.';
      } else if (lower.includes('reset')) {
        resetSim();
        simControlReply = '⟲ Simulation reset to initial conditions.';
      } else if (lower.match(/speed.*(0\.1|0\.25|0\.5|1|2|10|100)/)) {
        const m = lower.match(/(\d+\.?\d*)\s*x?/);
        const spd = m ? parseFloat(m[1]) : 1;
        if ([0.1,0.25,0.5,1,2,10,100].includes(spd)) {
          simRef.current.speed = spd;
          setUi((p) => ({ ...p, speed: spd }));
          simControlReply = `⚡ Speed set to ${spd}×.`;
        }
      } else if (lower.includes('figure') || lower.includes('figure-8') || lower.includes('figure8')) {
        loadPreset('figureEight');
        simControlReply = '🌀 Loaded Figure-8 Orbit preset.';
      } else if (lower.includes('chaos') && lower.includes('preset')) {
        loadPreset('chaos');
        simControlReply = '💥 Loaded Equal-Mass Chaos preset.';
      } else if (lower.includes('hierarchical')) {
        loadPreset('hierarchical');
        simControlReply = '⭐ Loaded Hierarchical Triple preset.';
      } else if (lower.includes('restricted')) {
        loadPreset('restricted');
        simControlReply = '🔬 Loaded Restricted Three-Body preset.';
      } else if (lower.includes('trail') && lower.includes('on')) {
        simRef.current.trailsOn = true;
        setUi((p) => ({ ...p, trailsOn: true }));
        simControlReply = '✓ Trails enabled.';
      } else if (lower.includes('trail') && lower.includes('off')) {
        simRef.current.trailsOn = false;
        setUi((p) => ({ ...p, trailsOn: false }));
        simControlReply = '✓ Trails disabled.';
      }

      let reply;
      if (simControlReply) {
        // Append a short AI comment after the control action
        const aiComment = await groqCall(
          [...nextMessages, { role: 'assistant', content: simControlReply }],
          'normal'
        );
        reply = `${simControlReply}\n\n${aiComment}`;
      } else {
        // Detect quiz answer if quiz mode is active
        reply = await groqCall(nextMessages, chatMode);
      }
      setChatMessages((m) => [...m, { role: 'assistant', content: reply }]);
    } catch (err) {
      setChatError(err.message || 'Request failed.');
    } finally {
      setChatLoading(false);
    }
  };

  // --- Narrate mode: auto-commentary every 8 seconds ---
  const startNarrate = () => {
    setChatMode('narrate');
    const run = async () => {
      setChatLoading(true);
      try {
        const reply = await groqCall([], 'narrate');
        setChatMessages((m) => [...m, { role: 'assistant', content: '🎙 ' + reply }]);
      } catch (e) { /* silent */ } finally {
        setChatLoading(false);
      }
    };
    run();
    const id = setInterval(run, 8000);
    setNarrateTimer(id);
  };

  const stopNarrate = () => {
    if (narrateTimer) { clearInterval(narrateTimer); setNarrateTimer(null); }
    setChatMode('normal');
  };

  // --- Explain button ---
  const explainNow = async () => {
    if (chatLoading) return;
    const prompt = 'In 3-4 sentences, explain what is currently happening in this simulation — the orbital configuration, stability, and what is physically interesting about it right now.';
    await sendChatMessage(prompt);
  };

  // --- Export chat as text ---
  const exportChat = () => {
    if (!chatMessages.length) return;
    const lines = chatMessages.map((m) => `[${m.role.toUpperCase()}]\n${m.content}`).join('\n\n---\n\n');
    const blob = new Blob([`THREE-BODY DYNAMICS — AI Chat Export\n${'='.repeat(40)}\n\n${lines}`], { type: 'text/plain' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'chat-notes.txt'; a.click();
  };

  // Cleanup narrate on unmount
  useEffect(() => () => { if (narrateTimer) clearInterval(narrateTimer); }, [narrateTimer]);

  useEffect(() => {
    analysisOpenRef.current = ui.analysisOpen;
  }, [ui.analysisOpen]);

  const loadEditVals = useCallback((idx, mode) => {
    const s = simRef.current;
    const src = mode === 'initial' ? s.initialState : s.state;
    const p = src.pos[idx];
    const v = src.vel[idx];
    setEditVals({
      px: p[0].toFixed(4), py: p[1].toFixed(4), pz: p[2].toFixed(4),
      vx: v[0].toFixed(4), vy: v[1].toFixed(4), vz: v[2].toFixed(4),
    });
  }, []);

  useEffect(() => {
    loadEditVals(ui.selected, ui.editMode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ui.selected, ui.editMode]);

  /* ---------------- Three.js setup (runs once, after entering) ---------------- */
  useEffect(() => {
    if (!entered || !mountRef.current) return;

    const mount = mountRef.current;
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x02040a, 0.028);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(50, mount.clientWidth / mount.clientHeight, 0.05, 200);
    cameraRef.current = camera;

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: true });
    } catch (e) {
      setUi((p) => ({ ...p, webglError: true }));
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.setClearColor(0x02040a, 1);
    mount.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lighting — ambient fill + a faint key light so spheres read as 3D
    scene.add(new THREE.AmbientLight(0x30405f, 1.1));
    const key = new THREE.PointLight(0xffffff, 1.4, 0, 2);
    key.position.set(4, 5, 6);
    scene.add(key);

    // Starfield
    scene.add(buildStarfield());

    // Reference grid (toggleable)
    const grid = new THREE.GridHelper(10, 20, 0x1c2b45, 0x121c30);
    grid.position.y = -2.2;
    grid.material.transparent = true;
    grid.material.opacity = 0.25;
    scene.add(grid);
    gridRef.current = grid;

    // Spacetime fabric grid (toggleable) — white grid warped downward near mass,
    // depth driven by the actual gravitational potential (not a decorative fake).
    const ST_N = 26;
    const ST_EXTENT = 4.2;
    const ST_BASE_Y = -1.9;
    const stPos = new Float32Array(ST_N * ST_N * 3);
    for (let ix = 0; ix < ST_N; ix++) {
      for (let iz = 0; iz < ST_N; iz++) {
        const x = (ix / (ST_N - 1) - 0.5) * 2 * ST_EXTENT;
        const z = (iz / (ST_N - 1) - 0.5) * 2 * ST_EXTENT;
        const idx = (ix * ST_N + iz) * 3;
        stPos[idx] = x; stPos[idx + 1] = ST_BASE_Y; stPos[idx + 2] = z;
      }
    }
    const stIndices = [];
    for (let ix = 0; ix < ST_N; ix++) {
      for (let iz = 0; iz < ST_N; iz++) {
        const i = ix * ST_N + iz;
        if (ix < ST_N - 1) stIndices.push(i, i + ST_N);
        if (iz < ST_N - 1) stIndices.push(i, i + 1);
      }
    }
    const stGeo = new THREE.BufferGeometry();
    stGeo.setAttribute('position', new THREE.BufferAttribute(stPos, 3));
    stGeo.setIndex(stIndices);
    const stMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.28 });
    const spacetimeGrid = new THREE.LineSegments(stGeo, stMat);
    spacetimeGrid.visible = false;
    scene.add(spacetimeGrid);
    spacetimeGridRef.current = spacetimeGrid;

    // Coordinate axes (toggleable, off by default)
    const axes = new THREE.AxesHelper(2.2);
    axes.visible = false;
    scene.add(axes);
    axesHelperRef.current = axes;

    // Bodies
    const sim = simRef.current;
    bodyMeshesRef.current = [];
    trailLinesRef.current = [];
    trailBuffersRef.current = [];
    arrowsRef.current = [];
    const textureLoader = new THREE.TextureLoader();
    for (let i = 0; i < 3; i++) {
      const geo = new THREE.SphereGeometry(sim.radii[i], 48, 48);
      const mat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: BODY_COLORS[i],
        emissiveIntensity: 0.12, // just a faint rim tint — texture carries the real look
        roughness: 0.75,
        metalness: 0.05,
      });
      // Real planetary imagery, loaded async — falls back to the flat accent color
      // (already set above) if the texture fails to load for any reason.
      textureLoader.load(
        BODY_TEXTURES[i],
        (tex) => {
          tex.colorSpace = THREE.SRGBColorSpace;
          mat.map = tex;
          mat.color.set(0xffffff);
          mat.emissiveIntensity = 0.08;
          mat.needsUpdate = true;
        },
        undefined,
        () => { /* keep flat-color fallback material on error */ }
      );
      const mesh = new THREE.Mesh(geo, mat);
      scene.add(mesh);
      bodyMeshesRef.current.push(mesh);

      // subtle glow halo
      const glowGeo = new THREE.SphereGeometry(sim.radii[i] * 1.9, 20, 20);
      const glowMat = new THREE.MeshBasicMaterial({
        color: BODY_COLORS[i],
        transparent: true,
        opacity: 0.11,
        depthWrite: false,
      });
      const glow = new THREE.Mesh(glowGeo, glowMat);
      mesh.add(glow);

      // Trail — preallocated buffer, ring-updated (no per-frame allocation)
      const arr = new Float32Array(TRAIL_LENGTH * 3);
      const tgeo = new THREE.BufferGeometry();
      tgeo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
      tgeo.setDrawRange(0, 0);
      const tmat = new THREE.LineBasicMaterial({
        color: BODY_COLORS[i],
        transparent: true,
        opacity: 0.55,
      });
      const line = new THREE.Line(tgeo, tmat);
      scene.add(line);
      trailLinesRef.current.push(line);
      trailBuffersRef.current.push({ arr, count: 0 });

      // Velocity vector arrow (toggleable, off by default)
      const arrow = new THREE.ArrowHelper(
        new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 0), 0.001, BODY_COLORS[i], 0.06, 0.04
      );
      arrow.visible = false;
      scene.add(arrow);
      arrowsRef.current.push(arrow);
    }

    // Center of mass marker
    const comGeo = new THREE.SphereGeometry(0.035, 12, 12);
    const comMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7 });
    const comMesh = new THREE.Mesh(comGeo, comMat);
    scene.add(comMesh);
    comMarkerRef.current = comMesh;

    // Chaos Lab twin ("ghost") bodies — hidden until Chaos Lab is enabled
    const bMeshes = [];
    for (let i = 0; i < 3; i++) {
      const geo = new THREE.SphereGeometry(sim.radii[i] * 0.85, 16, 16);
      const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true, transparent: true, opacity: 0.55 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.visible = false;
      scene.add(mesh);
      bMeshes.push(mesh);
    }
    bodyMeshesBRef.current = bMeshes;

    // ---- Gravitational field visualization (Phase 7) ----
    // Shared sample grid on the XY plane (z=0), rebuilt once — cheap enough
    // (12x12 = 144 points) that recomputing the field on it every throttled
    // tick has no meaningful performance cost.
    const FIELD_N = 12;
    const FIELD_EXTENT = 3.6;
    const fieldGridPoints = [];
    for (let ix = 0; ix < FIELD_N; ix++) {
      for (let iy = 0; iy < FIELD_N; iy++) {
        const x = (ix / (FIELD_N - 1) - 0.5) * 2 * FIELD_EXTENT;
        const y = (iy / (FIELD_N - 1) - 0.5) * 2 * FIELD_EXTENT;
        fieldGridPoints.push([x, y, 0]);
      }
    }
    const gridCount = fieldGridPoints.length;

    // FIELD LINES — short, uniform-length glyphs showing direction only
    const linesPos = new Float32Array(gridCount * 2 * 3);
    const linesGeo = new THREE.BufferGeometry();
    linesGeo.setAttribute('position', new THREE.BufferAttribute(linesPos, 3));
    const linesMat = new THREE.LineBasicMaterial({ color: 0x6fd3ff, transparent: true, opacity: 0.28 });
    const fieldLines = new THREE.LineSegments(linesGeo, linesMat);
    fieldLines.visible = false;
    scene.add(fieldLines);
    fieldLinesRef.current = fieldLines;

    // VECTOR FIELD — length encodes local field magnitude
    const vecPos = new Float32Array(gridCount * 2 * 3);
    const vecGeo = new THREE.BufferGeometry();
    vecGeo.setAttribute('position', new THREE.BufferAttribute(vecPos, 3));
    const vecMat = new THREE.LineBasicMaterial({ color: 0xb98cff, transparent: true, opacity: 0.5 });
    const fieldVectors = new THREE.LineSegments(vecGeo, vecMat);
    fieldVectors.visible = false;
    scene.add(fieldVectors);
    fieldVectorsRef.current = fieldVectors;

    // POTENTIAL CONTOURS — heatmap-style dots shaded by local potential depth
    const potPos = new Float32Array(gridCount * 3);
    const potCol = new Float32Array(gridCount * 3);
    fieldGridPoints.forEach((p, i) => {
      potPos[i * 3] = p[0]; potPos[i * 3 + 1] = p[1]; potPos[i * 3 + 2] = p[2];
    });
    const potGeo = new THREE.BufferGeometry();
    potGeo.setAttribute('position', new THREE.BufferAttribute(potPos, 3));
    potGeo.setAttribute('color', new THREE.BufferAttribute(potCol, 3));
    const potMat = new THREE.PointsMaterial({ size: 0.11, vertexColors: true, transparent: true, opacity: 0.8, depthWrite: false });
    const fieldPotential = new THREE.Points(potGeo, potMat);
    fieldPotential.visible = false;
    scene.add(fieldPotential);
    fieldPotentialRef.current = fieldPotential;

    // PARTICLE FLOW — tracer particles advected along the field, respawned on drift/collapse
    const PARTICLE_COUNT = 220;
    const partPos = new Float32Array(PARTICLE_COUNT * 3);
    const particleData = [];
    function respawnParticle(i) {
      const x = (Math.random() - 0.5) * 2 * FIELD_EXTENT;
      const y = (Math.random() - 0.5) * 2 * FIELD_EXTENT;
      const z = (Math.random() - 0.5) * 1.4;
      partPos[i * 3] = x; partPos[i * 3 + 1] = y; partPos[i * 3 + 2] = z;
    }
    for (let i = 0; i < PARTICLE_COUNT; i++) { respawnParticle(i); particleData.push(0); }
    fieldParticleDataRef.current = particleData;
    const partGeo = new THREE.BufferGeometry();
    partGeo.setAttribute('position', new THREE.BufferAttribute(partPos, 3));
    const partMat = new THREE.PointsMaterial({ size: 0.045, color: 0xffcf7a, transparent: true, opacity: 0.85, depthWrite: false });
    const fieldParticles = new THREE.Points(partGeo, partMat);
    fieldParticles.visible = false;
    scene.add(fieldParticles);
    fieldParticlesRef.current = fieldParticles;

    sim.initialEnergy = computeEnergy(sim.state, sim.masses, sim.G).total;

    function pushTrailSample() {
      for (let i = 0; i < 3; i++) {
        const buf = trailBuffersRef.current[i];
        const idx = (buf.count % TRAIL_LENGTH) * 3;
        buf.arr[idx] = sim.state.pos[i][0];
        buf.arr[idx + 1] = sim.state.pos[i][1];
        buf.arr[idx + 2] = sim.state.pos[i][2];
        buf.count++;
      }
    }

    // ---- Manual orbit / pan / zoom / select controls ----
    const dom = renderer.domElement;

    function pickBodyAt(clientX, clientY) {
      const rect = dom.getBoundingClientRect();
      const ndc = new THREE.Vector2(
        ((clientX - rect.left) / rect.width) * 2 - 1,
        -((clientY - rect.top) / rect.height) * 2 + 1
      );
      raycasterRef.current.setFromCamera(ndc, camera);
      const hits = raycasterRef.current.intersectObjects(bodyMeshesRef.current);
      if (hits.length) return bodyMeshesRef.current.indexOf(hits[0].object);
      return -1;
    }

    const onPointerDown = (e) => {
      dragRef.current.dragging = true;
      dragRef.current.panning = e.button === 2 || e.shiftKey;
      dragRef.current.lastX = e.clientX;
      dragRef.current.lastY = e.clientY;
      dragRef.current.moved = 0;
    };
    const onPointerUp = (e) => {
      const wasDrag = dragRef.current.dragging;
      const moved = dragRef.current.moved;
      const wasPanning = dragRef.current.panning;
      dragRef.current.dragging = false;
      if (wasDrag && !wasPanning && moved < 6) {
        const idx = pickBodyAt(e.clientX, e.clientY);
        if (idx >= 0) {
          const now = performance.now();
          const isDbl = now - clickRef.current.time < 400 && clickRef.current.index === idx;
          clickRef.current = { time: now, index: idx };
          simRef.current.selected = idx;
          setUi((p) => ({ ...p, selected: idx }));
          if (isDbl) {
            camStateRef.current.mode = 'body' + idx;
            setUi((p) => ({ ...p, camMode: 'body' + idx }));
          }
        }
      }
    };
    const onPointerMove = (e) => {
      if (!dragRef.current.dragging) return;
      const dx = e.clientX - dragRef.current.lastX;
      const dy = e.clientY - dragRef.current.lastY;
      dragRef.current.lastX = e.clientX;
      dragRef.current.lastY = e.clientY;
      dragRef.current.moved += Math.abs(dx) + Math.abs(dy);
      const cs = camStateRef.current;
      if (dragRef.current.panning) {
        const panScale = cs.dist * 0.0016;
        const camDir = new THREE.Vector3();
        camera.getWorldDirection(camDir);
        const right = new THREE.Vector3().crossVectors(camDir, camera.up).normalize();
        const up = new THREE.Vector3().crossVectors(right, camDir).normalize();
        cs.target.addScaledVector(right, -dx * panScale);
        cs.target.addScaledVector(up, dy * panScale);
        if (cs.mode !== 'free') { cs.mode = 'free'; setUi((p) => ({ ...p, camMode: 'free' })); }
      } else {
        cs.theta -= dx * 0.006;
        cs.phi -= dy * 0.006;
        cs.phi = Math.max(0.12, Math.min(Math.PI - 0.12, cs.phi));
        if (cs.mode === 'top' || cs.mode === 'front' || cs.mode === 'side' || cs.mode === 'auto') {
          cs.mode = 'free';
          setUi((p) => ({ ...p, camMode: 'free' }));
        }
      }
    };
    const onWheel = (e) => {
      e.preventDefault();
      const cs = camStateRef.current;
      cs.dist *= 1 + e.deltaY * 0.001;
      cs.dist = Math.max(1.2, Math.min(40, cs.dist));
    };
    const onContextMenu = (e) => e.preventDefault();
    dom.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointermove', onPointerMove);
    dom.addEventListener('wheel', onWheel, { passive: false });
    dom.addEventListener('contextmenu', onContextMenu);

    const onResize = () => {
      if (!mount) return;
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };
    window.addEventListener('resize', onResize);
    const resizeObserver = new ResizeObserver(onResize);
    resizeObserver.observe(mount);

    /* ---------------- Main loop — physics + render, decoupled from React ---------------- */
    let raf = 0;
    let lastFrameT = performance.now();
    let uiAccum = 0;
    let frameAccum = 0;
    let frameCount = 0;
    let fps = 60;
    let chartAccum = 0;

    const loop = (now) => {
      raf = requestAnimationFrame(loop);
      const frameDt = Math.min((now - lastFrameT) / 1000, 0.05);
      lastFrameT = now;
      frameCount++;
      frameAccum += frameDt;
      if (frameAccum >= 0.5) {
        fps = frameCount / frameAccum;
        frameCount = 0;
        frameAccum = 0;
      }

      const s = simRef.current;

      if (s.running) {
        let remaining = frameDt * s.speed;
        let substeps = 0;
        while (remaining > 0 && substeps < 400) {
          substeps++;

          if (s.adaptiveOn) {
            const { result, err } = stepDoubling(s.state, s.masses, s.G, s.dt);
            if (err > s.tolerance && s.dt > s.dtMin + 1e-9) {
              s.dt = Math.max(s.dtMin, s.dt * 0.5);
              continue; // reject step, retry smaller — does not consume a substep's worth of sim time
            }
            const usedDt = s.dt;
            s.state = result;
            s.simTime += usedDt;
            remaining -= usedDt;
            if (err < s.tolerance * 0.15) s.dt = Math.min(s.dtMax, s.dt * 1.4);
            if (s.chaosOn && sysBRef.current) {
              sysBRef.current.state = integrateStep(sysBRef.current.state, s.masses, s.G, usedDt, s.integrator);
            }
            pushTrailSample();
          } else {
            // Close-encounter softening: shrink the effective step near tight passes
            const minD = minPairDistance(s.state);
            const closeFactor = minD < 0.08 ? Math.max(0.05, minD / 0.08) : 1;
            const h = Math.min(s.dt * closeFactor, remaining);
            s.state = integrateStep(s.state, s.masses, s.G, h, s.integrator);
            s.simTime += h;
            remaining -= h;
            if (s.chaosOn && sysBRef.current) {
              sysBRef.current.state = integrateStep(sysBRef.current.state, s.masses, s.G, h, s.integrator);
            }
            pushTrailSample();
          }
        }

        const minD2 = minPairDistance(s.state);
        if (!Number.isFinite(minD2) || s.state.pos.some((p) => p.some((c) => !Number.isFinite(c)))) {
          s.running = false;
          s.numericalWarning = 'NUMERICAL INSTABILITY DETECTED — reduce dt or switch to RK4.';
        } else if (minD2 < 0.05) {
          s.numericalWarning = 'CLOSE ENCOUNTER — timestep automatically reduced.';
        } else {
          s.numericalWarning = null;
        }
      }

      // ---- sync meshes ----
      for (let i = 0; i < 3; i++) {
        const p = s.state.pos[i];
        bodyMeshesRef.current[i].position.set(p[0], p[1], p[2]);
        bodyMeshesRef.current[i].rotation.y += BODY_ROT_SPEED[i] * frameDt; // slow self-spin, independent of orbit
        const isSel = s.selected === i;
        bodyMeshesRef.current[i].material.emissiveIntensity = isSel ? 0.4 : (bodyMeshesRef.current[i].material.map ? 0.08 : 0.12);
        bodyMeshesRef.current[i].scale.setScalar(isSel ? 1.18 : 1.0);
      }

      // ---- Chaos Lab ghost sync ----
      if (s.chaosOn && sysBRef.current) {
        const sepNow = computeSeparation(s.state, sysBRef.current.state);
        if (Number.isFinite(sepNow)) s.chaosMaxSep = Math.max(s.chaosMaxSep, sepNow);
        for (let i = 0; i < 3; i++) {
          const p = sysBRef.current.state.pos[i];
          const finite = p.every(Number.isFinite);
          bodyMeshesBRef.current[i].visible = finite;
          if (finite) bodyMeshesBRef.current[i].position.set(p[0], p[1], p[2]);
        }
      } else {
        bodyMeshesBRef.current.forEach((m) => (m.visible = false));
      }
      const com = computeCOM(s.state, s.masses);
      comMarkerRef.current.position.set(com[0], com[1], com[2]);
      comMarkerRef.current.visible = s.showCOM;
      gridRef.current.visible = s.showGrid;
      spacetimeGridRef.current.visible = s.showSpacetime;
      axesHelperRef.current.visible = s.showAxes;

      // ---- gravitational field visualization ----
      fieldLinesRef.current.visible = s.fieldMode === 'lines';
      fieldVectorsRef.current.visible = s.fieldMode === 'vectors';
      fieldPotentialRef.current.visible = s.fieldMode === 'potential';
      fieldParticlesRef.current.visible = s.fieldMode === 'particles';

      if (s.fieldMode === 'particles') {
        // Advected every frame for smooth flow — cheap: ~220 points x 3-body field calc
        const posAttr = fieldParticlesRef.current.geometry.attributes.position;
        const arr = posAttr.array;
        const pdata = fieldParticleDataRef.current;
        const advectDt = Math.min(frameDt, 0.05) * 2.2;
        for (let i = 0; i < PARTICLE_COUNT; i++) {
          const px = arr[i * 3], py = arr[i * 3 + 1], pz = arr[i * 3 + 2];
          const fld = computeFieldAt([px, py, pz], s.state.pos, s.masses, s.G);
          const speed2 = vDot(fld, fld);
          const dist2Center = px * px + py * py + pz * pz;
          pdata[i] += frameDt;
          const tooFast = speed2 > 400; // whipped in too close to a body — singularity-adjacent
          const tooFar = dist2Center > (FIELD_EXTENT * 1.6) * (FIELD_EXTENT * 1.6);
          const expired = pdata[i] > 9;
          if (tooFast || tooFar || expired) {
            respawnParticle(i);
            pdata[i] = 0;
          } else {
            arr[i * 3] += fld[0] * advectDt;
            arr[i * 3 + 1] += fld[1] * advectDt;
            arr[i * 3 + 2] += fld[2] * advectDt;
          }
        }
        posAttr.needsUpdate = true;
      }

      // ---- sync trails ----
      if (s.trailsOn) {
        for (let i = 0; i < 3; i++) {
          const buf = trailBuffersRef.current[i];
          const line = trailLinesRef.current[i];
          line.visible = true;
          const n = Math.min(buf.count, TRAIL_LENGTH);
          line.geometry.attributes.position.needsUpdate = true;
          line.geometry.setDrawRange(0, n);
        }
      } else {
        trailLinesRef.current.forEach((l) => (l.visible = false));
      }

      // ---- sync velocity vectors ----
      if (s.showVectors) {
        for (let i = 0; i < 3; i++) {
          const arrow = arrowsRef.current[i];
          const p = s.state.pos[i];
          const v = s.state.vel[i];
          const speed = vLen(v);
          arrow.visible = speed > 1e-6;
          if (arrow.visible) {
            arrow.position.set(p[0], p[1], p[2]);
            const dir = new THREE.Vector3(v[0], v[1], v[2]).normalize();
            arrow.setDirection(dir);
            const len = Math.min(1.4, Math.max(0.08, speed * 0.4));
            arrow.setLength(len, len * 0.28, len * 0.16);
          }
        }
      } else {
        arrowsRef.current.forEach((a) => (a.visible = false));
      }

      // ---- sync HTML labels (direct DOM, bypasses React for perf) ----
      if (s.showLabels) {
        for (let i = 0; i < 3; i++) {
          const el = labelRefs.current[i];
          if (!el) continue;
          const p = bodyMeshesRef.current[i].position.clone();
          p.project(camera);
          const x = (p.x * 0.5 + 0.5) * mount.clientWidth;
          const y = (-p.y * 0.5 + 0.5) * mount.clientHeight;
          const behind = p.z > 1;
          el.style.display = behind ? 'none' : 'block';
          el.style.transform = `translate(${x}px, ${y}px)`;
        }
      } else {
        labelRefs.current.forEach((el) => { if (el) el.style.display = 'none'; });
      }

      // ---- camera ----
      const cs = camStateRef.current;
      if (cs.mode === 'body0' || cs.mode === 'body1' || cs.mode === 'body2') {
        const idx = Number(cs.mode.slice(4));
        const p = s.state.pos[idx];
        cs.desiredTarget.set(p[0], p[1], p[2]);
        cs.target.lerp(cs.desiredTarget, 0.08);
      } else if (cs.mode === 'com') {
        cs.desiredTarget.set(com[0], com[1], com[2]);
        cs.target.lerp(cs.desiredTarget, 0.08);
      } else if (cs.mode === 'top') {
        cs.desiredTarget.set(com[0], com[1], com[2]);
        cs.target.lerp(cs.desiredTarget, 0.08);
        cs.phi += (0.12 - cs.phi) * 0.08;
      } else if (cs.mode === 'front') {
        cs.desiredTarget.set(com[0], com[1], com[2]);
        cs.target.lerp(cs.desiredTarget, 0.08);
        cs.theta += (0 - cs.theta) * 0.08;
        cs.phi += (Math.PI / 2 - cs.phi) * 0.08;
      } else if (cs.mode === 'side') {
        cs.desiredTarget.set(com[0], com[1], com[2]);
        cs.target.lerp(cs.desiredTarget, 0.08);
        cs.theta += (Math.PI / 2 - cs.theta) * 0.08;
        cs.phi += (Math.PI / 2 - cs.phi) * 0.08;
      } else if (cs.mode === 'auto') {
        cs.desiredTarget.set(com[0], com[1], com[2]);
        cs.target.lerp(cs.desiredTarget, 0.05);
        cs.theta += frameDt * 0.18;
      }
      const camX = cs.target.x + cs.dist * Math.sin(cs.phi) * Math.sin(cs.theta);
      const camY = cs.target.y + cs.dist * Math.cos(cs.phi);
      const camZ = cs.target.z + cs.dist * Math.sin(cs.phi) * Math.cos(cs.theta);
      camera.position.set(camX, camY, camZ);
      camera.lookAt(cs.target);

      renderer.render(scene, camera);

      // ---- throttled UI telemetry sync (~10 Hz) ----
      uiAccum += frameDt;
      if (uiAccum > 0.1) {
        uiAccum = 0;
        const energy = computeEnergy(s.state, s.masses, s.G);
        const p = computeMomentum(s.state, s.masses);
        const L = computeAngularMomentum(s.state, s.masses);
        const err = s.initialEnergy ? Math.abs((energy.total - s.initialEnergy) / s.initialEnergy) : 0;
        const selIdx = s.selected;
        const selPos = s.state.pos[selIdx];
        const selVel = s.state.vel[selIdx];
        const nextIdx = (selIdx + 1) % 3;
        const distNext = vLen(vSub(s.state.pos[nextIdx], selPos));
        const distInfo = computePairDistances(s.state);

        // ---- spacetime fabric deformation (throttled) — dip depth driven by real potential ----
        if (s.showSpacetime) {
          const arr = spacetimeGridRef.current.geometry.attributes.position.array;
          for (let i = 0; i < ST_N * ST_N; i++) {
            const x = arr[i * 3];
            const z = arr[i * 3 + 2];
            const u = computePotentialAt([x, ST_BASE_Y, z], s.state.pos, s.masses, s.G);
            const depth = Math.max(-1.6, u * 0.55);
            arr[i * 3 + 1] = ST_BASE_Y + depth;
          }
          spacetimeGridRef.current.geometry.attributes.position.needsUpdate = true;
        }

        // ---- gravitational field grid update (throttled — field changes slowly visually) ----
        if (s.fieldMode === 'lines' || s.fieldMode === 'vectors') {
          const target = s.fieldMode === 'lines' ? fieldLinesRef.current : fieldVectorsRef.current;
          const arr = target.geometry.attributes.position.array;
          for (let i = 0; i < gridCount; i++) {
            const gp = fieldGridPoints[i];
            const fld = computeFieldAt(gp, s.state.pos, s.masses, s.G);
            const mag = vLen(fld);
            let len;
            if (s.fieldMode === 'lines') {
              len = 0.22; // uniform — direction only
            } else {
              len = Math.min(0.7, 0.06 + Math.log(1 + mag) * 0.22); // magnitude-encoded
            }
            const dir = mag > 1e-9 ? vScale(fld, len / mag) : [0, 0, 0];
            const base = i * 6;
            arr[base] = gp[0]; arr[base + 1] = gp[1]; arr[base + 2] = gp[2];
            arr[base + 3] = gp[0] + dir[0]; arr[base + 4] = gp[1] + dir[1]; arr[base + 5] = gp[2] + dir[2];
          }
          target.geometry.attributes.position.needsUpdate = true;
        } else if (s.fieldMode === 'potential') {
          const pot = fieldGridPoints.map((gp) => computePotentialAt(gp, s.state.pos, s.masses, s.G));
          const uMin = Math.min(...pot);
          const uMax = Math.max(...pot);
          const range = uMax - uMin || 1;
          const colArr = fieldPotentialRef.current.geometry.attributes.color.array;
          for (let i = 0; i < gridCount; i++) {
            const t = (pot[i] - uMin) / range; // 0 = deepest well, 1 = shallowest
            // deep well -> amber/violet, shallow -> cyan/white
            const r = 0.25 + t * 0.55;
            const g = 0.35 + t * 0.55;
            const b = 0.55 + (1 - t) * 0.35;
            colArr[i * 3] = r; colArr[i * 3 + 1] = g; colArr[i * 3 + 2] = b;
          }
          fieldPotentialRef.current.geometry.attributes.color.needsUpdate = true;
        }

        // Chaos Lab telemetry — only meaningful once a twin system exists
        let chaosSep = 0;
        let chaosLyap = null;
        if (s.chaosOn && sysBRef.current) {
          chaosSep = computeSeparation(s.state, sysBRef.current.state);
          const elapsed = s.simTime - s.chaosT0;
          if (elapsed > 1e-6 && s.chaosInitialSep > 0 && chaosSep > 0) {
            chaosLyap = Math.log(chaosSep / s.chaosInitialSep) / elapsed;
          }
        }

        // ---- sample into analysis history (only while running, so paused time doesn't pad the buffer) ----
        if (s.running) {
          const H = historyRef.current;
          const accel = computeAccelerations(s.state.pos, s.masses, s.G);
          H.t.push(s.simTime);
          for (let i = 0; i < 3; i++) {
            H[`p${i}x`].push(s.state.pos[i][0]); H[`p${i}y`].push(s.state.pos[i][1]); H[`p${i}z`].push(s.state.pos[i][2]);
            H[`v${i}x`].push(s.state.vel[i][0]); H[`v${i}y`].push(s.state.vel[i][1]); H[`v${i}z`].push(s.state.vel[i][2]);
            H[`a${i}x`].push(accel[i][0]); H[`a${i}y`].push(accel[i][1]); H[`a${i}z`].push(accel[i][2]);
          }
          H.KE.push(energy.KE);
          H.PE.push(energy.PE);
          H.Etot.push(energy.total);
          H.err.push(err);
          H.Px.push(p[0]); H.Py.push(p[1]); H.Pz.push(p[2]);
          H.Lx.push(L[0]); H.Ly.push(L[1]); H.Lz.push(L[2]);
          H.momMag.push(vLen(p));
          H.angMag.push(vLen(L));
          H.comx.push(com[0]); H.comy.push(com[1]); H.comz.push(com[2]);
          H.d01.push(distInfo.pairs.d01);
          H.d02.push(distInfo.pairs.d02);
          H.d12.push(distInfo.pairs.d12);
          if (s.chaosOn && sysBRef.current) {
            H.chaosT.push(s.simTime - s.chaosT0);
            H.sep.push(chaosSep);
          }
          const MAX_HISTORY = 2000;
          Object.keys(H).forEach((k) => {
            if (H[k].length > MAX_HISTORY) H[k].splice(0, H[k].length - MAX_HISTORY);
          });
        }

        setUi((prev) => ({
          ...prev,
          running: s.running,
          simTime: s.simTime,
          fps: Math.round(fps),
          dt: s.dt,
          energy,
          energyError: err,
          momentumMag: vLen(p),
          angMomentumMag: vLen(L),
          com,
          minDist: distInfo.min,
          maxDist: distInfo.max,
          pairDist: distInfo.pairs,
          warning: s.numericalWarning || null,
          bodyData: { pos: selPos, vel: selVel, speed: vLen(selVel), distNext },
          chaosSep,
          chaosLyap,
          chaosMaxSep: s.chaosMaxSep,
          chaosInitialSep: s.chaosInitialSep,
        }));
      }

      // ---- analysis chart redraw, only while the drawer is open (cheap, ~3Hz) ----
      chartAccum += frameDt;
      if (chartAccum > 0.3 && analysisOpenRef.current) {
        chartAccum = 0;
        setChartTick((c) => c + 1);
      }
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      window.removeEventListener('resize', onResize);
      dom.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointermove', onPointerMove);
      dom.removeEventListener('wheel', onWheel);
      dom.removeEventListener('contextmenu', onContextMenu);
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };
  }, [entered]);

  /* ---------------- Keyboard shortcuts ---------------- */
  useEffect(() => {
    const onKey = (e) => {
      if (!entered) return;
      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.key === 'r' || e.key === 'R') {
        resetSim();
      } else if (e.key === 't' || e.key === 'T') {
        simRef.current.trailsOn = !simRef.current.trailsOn;
        setUi((p) => ({ ...p, trailsOn: simRef.current.trailsOn }));
      } else if (e.key === 'v' || e.key === 'V') {
        simRef.current.showVectors = !simRef.current.showVectors;
        setUi((p) => ({ ...p, showVectors: simRef.current.showVectors }));
      } else if (e.key === 'c' || e.key === 'C') {
        cycleCameraMode();
      } else if (e.key === 'f' || e.key === 'F') {
        camStateRef.current.mode = 'body' + simRef.current.selected;
        setUi((p) => ({ ...p, camMode: 'body' + simRef.current.selected }));
      } else if (e.key === 'a' || e.key === 'A') {
        setUi((p) => ({ ...p, analysisOpen: !p.analysisOpen }));
      } else if (e.key === '?') {
        setUi((p) => ({ ...p, helpOpen: !p.helpOpen }));
      } else if (e.key === 'Escape') {
        setUi((p) => ({ ...p, analysisOpen: false, helpOpen: false }));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entered]);

  /* ---------------- Controls ---------------- */
  const clearHistoryArrays = () => {
    const H = historyRef.current;
    Object.keys(H).forEach((k) => (H[k] = []));
  };

  const togglePlay = useCallback(() => {
    const s = simRef.current;
    s.running = !s.running;
    setUi((p) => ({ ...p, running: s.running }));
  }, []);

  const resetSim = useCallback(() => {
    const s = simRef.current;
    s.state = JSON.parse(JSON.stringify(s.initialState));
    s.simTime = 0;
    s.running = false;
    s.initialEnergy = computeEnergy(s.state, s.masses, s.G).total;
    trailBuffersRef.current.forEach((b) => (b.count = 0));
    trailLinesRef.current.forEach((l) => l.geometry.setDrawRange(0, 0));
    clearHistoryArrays();
    if (s.chaosOn && sysBRef.current) {
      sysBRef.current.state = JSON.parse(JSON.stringify(sysBRef.current.initialState));
      s.chaosMaxSep = s.chaosInitialSep;
      s.chaosT0 = 0;
    }
    setUi((p) => ({ ...p, running: false, simTime: 0, warning: null, chaosSep: s.chaosInitialSep, chaosLyap: null }));
  }, []);

  const stepOnce = useCallback(() => {
    const s = simRef.current;
    s.state = integrateStep(s.state, s.masses, s.G, s.dt, s.integrator);
    s.simTime += s.dt;
    for (let i = 0; i < 3; i++) {
      const buf = trailBuffersRef.current[i];
      const idx = (buf.count % TRAIL_LENGTH) * 3;
      buf.arr[idx] = s.state.pos[i][0];
      buf.arr[idx + 1] = s.state.pos[i][1];
      buf.arr[idx + 2] = s.state.pos[i][2];
      buf.count++;
    }
  }, []);

  const setIntegrator = (method) => {
    simRef.current.integrator = method;
    setUi((p) => ({ ...p, integrator: method }));
  };

  const setSpeed = (v) => {
    simRef.current.speed = v;
    setUi((p) => ({ ...p, speed: v }));
  };

  const setMass = (i, v) => {
    simRef.current.masses[i] = v;
    setUi((p) => {
      const masses = [...p.masses];
      masses[i] = v;
      return { ...p, masses };
    });
  };

  const loadPreset = (key) => {
    const fresh = makeSim(key);
    simRef.current = fresh;
    sysBRef.current = null;
    bodyMeshesBRef.current.forEach((m) => (m.visible = false));
    trailBuffersRef.current.forEach((b) => (b.count = 0));
    trailLinesRef.current.forEach((l) => l.geometry.setDrawRange(0, 0));
    clearHistoryArrays();
    camStateRef.current.mode = 'free';
    setUi((p) => ({
      ...p,
      running: false,
      simTime: 0,
      integrator: fresh.integrator,
      speed: fresh.speed,
      masses: [...fresh.masses],
      presetKey: key,
      warning: null,
      camMode: 'free',
      selected: 0,
      chaosOn: false,
      chaosSep: 0,
      chaosLyap: null,
      chaosMaxSep: 0,
      chaosInitialSep: 0,
    }));
  };

  const togglePanel = (side) => setUi((p) => ({ ...p, [side]: !p[side] }));

  const toggleAnalysis = () => setUi((p) => ({ ...p, analysisOpen: !p.analysisOpen }));
  const setAnalysisTab = (tab) => setUi((p) => ({ ...p, analysisTab: tab }));

  const selectBody = (idx) => {
    simRef.current.selected = idx;
    setUi((p) => ({ ...p, selected: idx }));
  };

  const setCamMode = (mode) => {
    camStateRef.current.mode = mode;
    setUi((p) => ({ ...p, camMode: mode }));
  };

  const cycleCameraMode = () => {
    const idx = CAMERA_MODES.findIndex((m) => m.key === camStateRef.current.mode);
    const next = CAMERA_MODES[(idx + 1) % CAMERA_MODES.length].key;
    setCamMode(next);
  };

  const resetCamera = () => {
    const cs = camStateRef.current;
    cs.mode = 'free';
    cs.theta = 0.9;
    cs.phi = 1.15;
    cs.dist = 6.5;
    cs.target.set(0, 0, 0);
    setUi((p) => ({ ...p, camMode: 'free' }));
  };

  const toggleFlag = (key) => {
    simRef.current[key] = !simRef.current[key];
    setUi((p) => ({ ...p, [key]: simRef.current[key] }));
  };

  const setAdaptiveField = (key, value) => {
    simRef.current[key] = value;
    setUi((p) => ({ ...p, [key]: value }));
  };

  const setEditMode = (mode) => setUi((p) => ({ ...p, editMode: mode }));

  const applyEditVals = () => {
    const s = simRef.current;
    const idx = ui.selected;
    const p = [parseFloat(editVals.px) || 0, parseFloat(editVals.py) || 0, parseFloat(editVals.pz) || 0];
    const v = [parseFloat(editVals.vx) || 0, parseFloat(editVals.vy) || 0, parseFloat(editVals.vz) || 0];
    const target = ui.editMode === 'initial' ? s.initialState : s.state;
    target.pos[idx] = p;
    target.vel[idx] = v;
    if (ui.editMode === 'live') {
      s.initialEnergy = computeEnergy(s.state, s.masses, s.G).total;
    }
  };

  /* ---------------- Chaos Lab (Phase 6) ---------------- */
  const setChaosField = (key, value) => {
    simRef.current[key] = value;
    setUi((p) => ({ ...p, [key]: value }));
  };

  const enableChaosLab = () => {
    const s = simRef.current;
    const cloneState = JSON.parse(JSON.stringify(s.state));
    const targets = s.perturbTarget === 'all' ? [0, 1, 2] : [Number(s.perturbTarget)];
    targets.forEach((idx) => {
      if (s.perturbType === 'position' || s.perturbType === 'both') {
        cloneState.pos[idx] = vAdd(cloneState.pos[idx], [s.epsilon, 0, 0]);
      }
      if (s.perturbType === 'velocity' || s.perturbType === 'both') {
        cloneState.vel[idx] = vAdd(cloneState.vel[idx], [0, s.epsilon, 0]);
      }
    });
    sysBRef.current = { state: cloneState, initialState: JSON.parse(JSON.stringify(cloneState)) };
    const sep0 = computeSeparation(s.state, cloneState);
    s.chaosOn = true;
    s.chaosInitialSep = sep0;
    s.chaosMaxSep = sep0;
    s.chaosT0 = s.simTime;
    const H = historyRef.current;
    H.chaosT = [];
    H.sep = [];
    setUi((p) => ({ ...p, chaosOn: true, chaosInitialSep: sep0, chaosSep: sep0, chaosMaxSep: sep0, chaosLyap: null }));
  };

  const disableChaosLab = () => {
    simRef.current.chaosOn = false;
    sysBRef.current = null;
    bodyMeshesBRef.current.forEach((m) => (m.visible = false));
    setUi((p) => ({ ...p, chaosOn: false }));
  };

  /* ---------------- Field visualization + Demo Mode (Phase 7) ---------------- */
  const setFieldMode = (mode) => {
    simRef.current.fieldMode = mode;
    setUi((p) => ({ ...p, fieldMode: mode }));
  };

  const enableDemoMode = () => {
    loadPreset('figureEight');
    camStateRef.current.mode = 'auto';
    simRef.current.trailsOn = true;
    simRef.current.running = true;
    setUi((p) => ({
      ...p,
      running: true,
      trailsOn: true,
      camMode: 'auto',
      panelLeft: true,
      panelRight: true,
      demoMode: true,
      analysisOpen: false,
    }));
  };

  const exitDemoMode = () => {
    simRef.current.running = false;
    setUi((p) => ({ ...p, running: false, demoMode: false }));
  };

  /* ---------------- Phase 8: fullscreen, export, screenshot, help ---------------- */
  useEffect(() => {
    const onFsChange = () => setUi((p) => ({ ...p, isFullscreen: !!document.fullscreenElement }));
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      rootRef.current?.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  };

  const takeScreenshot = () => {
    if (!rendererRef.current) return;
    const url = rendererRef.current.domElement.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `three-body-dynamics-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const exportCSV = () => downloadTextFile(buildExportCSV(historyRef.current), `three-body-dynamics-${Date.now()}.csv`, 'text/csv');
  const exportJSON = () => downloadTextFile(buildExportJSON(historyRef.current), `three-body-dynamics-${Date.now()}.json`, 'application/json');

  const toggleHelp = () => setUi((p) => ({ ...p, helpOpen: !p.helpOpen }));

  /* ---------------- Render ---------------- */

  if (ui.webglError) {
    return (
      <div className="w-full h-full min-h-[600px] bg-[#02040a] flex flex-col items-center justify-center text-center px-6">
        <div className="text-amber-400 text-2xl mb-3">⚠</div>
        <h2 className="text-slate-200 text-lg mb-2 font-mono tracking-wide">WEBGL UNAVAILABLE</h2>
        <p className="text-slate-500 text-sm max-w-sm font-mono">
          This browser or device couldn't create a WebGL context, so the 3D simulation can't render.
          Try a different browser, enable hardware acceleration, or update your graphics drivers.
        </p>
      </div>
    );
  }

  if (!entered) {
    return (
      <div className="w-full h-full min-h-[600px] bg-[#02040a] flex flex-col items-center justify-center text-center px-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-40" style={{
          background: 'radial-gradient(circle at 50% 35%, rgba(111,211,255,0.08), transparent 60%)'
        }} />
        <div className="relative z-10">
          <div className="text-[11px] tracking-[0.35em] text-cyan-300/70 mb-3 font-mono">RK4 · CHAOS LAB · FIELD VISUALIZATION</div>
          <h1 className="text-3xl md:text-5xl font-light text-slate-100 tracking-wide mb-2">
            THREE-BODY DYNAMICS
          </h1>
          <p className="text-slate-500 text-[11px] tracking-widest font-mono mb-5">
            Created by Ram Vishwakarma · Physics Student, IEHE Bhopal
          </p>
          <p className="text-slate-400 text-sm md:text-base max-w-md mx-auto mb-8 font-light">
            A numerical exploration of gravitational motion and chaos
          </p>
          <button
            onClick={() => setEntered(true)}
            className="px-8 py-3 border border-cyan-400/40 text-cyan-200 tracking-[0.2em] text-xs font-mono hover:bg-cyan-400/10 hover:border-cyan-300/70 transition-colors"
          >
            ENTER SIMULATION
          </button>
          <div className="mt-6 text-[10px] tracking-[0.3em] text-slate-500 font-mono">
            RK4 &nbsp;•&nbsp; 3D &nbsp;•&nbsp; REAL-TIME
          </div>
        </div>
      </div>
    );
  }

  const fmt = (n, d = 4) => (Number.isFinite(n) ? n.toFixed(d) : '—');

  return (
    <div ref={rootRef} className="w-full h-full min-h-[600px] bg-[#02040a] relative overflow-hidden select-none font-mono">
      {/* 3D viewport */}
      <div ref={mountRef} className="absolute inset-0 cursor-grab active:cursor-grabbing" />

      {/* Cinematic vignette — no postprocessing pipeline available in this sandbox,
          so depth/atmosphere is approximated with a CSS radial gradient overlay */}
      <div
        className="absolute inset-0 pointer-events-none z-[5]"
        style={{ background: 'radial-gradient(ellipse at center, transparent 45%, rgba(0,0,0,0.55) 100%)' }}
      />

      {/* Body labels (direct-DOM updated for perf) */}
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          ref={(el) => (labelRefs.current[i] = el)}
          className="absolute top-0 left-0 pointer-events-none text-[9px] tracking-widest px-1 py-0.5 -translate-x-1/2 -translate-y-[130%] hidden z-10"
          style={{ color: BODY_HEX[i], textShadow: '0 0 6px rgba(0,0,0,0.9)' }}
        >
          {BODY_NAMES[i]}
        </div>
      ))}

      {ui.demoMode && (
        <div className="absolute top-14 right-3 z-30">
          <SmallBtn onClick={exitDemoMode} active>EXIT DEMO MODE</SmallBtn>
        </div>
      )}

      {/* TOP STATUS BAR */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 py-2.5 bg-black/40 backdrop-blur-sm border-b border-white/10 text-[11px] text-slate-300 z-20">
        <div className="flex items-center gap-4">
          <span className="tracking-[0.25em] text-slate-100 text-xs">THREE-BODY DYNAMICS</span>
          <span className="flex items-center gap-1.5">
            <span
              className={`w-1.5 h-1.5 rounded-full ${ui.running ? 'bg-cyan-400 animate-pulse' : 'bg-slate-500'}`}
            />
            {ui.running ? 'RUNNING' : 'PAUSED'}
          </span>
        </div>
        <div className="hidden md:flex items-center gap-5 text-slate-400">
          <span>T = {fmt(ui.simTime, 3)}s</span>
          <span>FPS {ui.fps}</span>
          <span>DT {ui.dt.toExponential(1)}</span>
          <span className="text-cyan-300/80">{ui.integrator.toUpperCase()}</span>
          <span className="text-violet-300/80">{CAMERA_MODES.find((m) => m.key === ui.camMode)?.label}</span>
          {!ui.demoMode && (
            <button onClick={enableDemoMode} className="text-slate-500 hover:text-amber-300 tracking-wide">
              DEMO MODE
            </button>
          )}
          <span className="flex items-center gap-2 pl-2 border-l border-white/10">
            <button onClick={takeScreenshot} title="Screenshot" aria-label="Take screenshot" className="text-slate-500 hover:text-cyan-300">
              ⌗
            </button>
            <button onClick={toggleFullscreen} title="Fullscreen" aria-label="Toggle fullscreen" className="text-slate-500 hover:text-cyan-300">
              {ui.isFullscreen ? '⤡' : '⤢'}
            </button>
            <button onClick={toggleHelp} title="Keyboard shortcuts" aria-label="Show keyboard shortcuts" className="text-slate-500 hover:text-cyan-300">
              ?
            </button>
            <button
              onClick={() => setChatOpen((v) => !v)}
              title="AI Assistant"
              aria-label="Toggle AI assistant"
              className={chatOpen ? 'text-cyan-300' : 'text-slate-500 hover:text-cyan-300'}
            >
              ◈
            </button>
          </span>
        </div>
      </div>

      {ui.helpOpen && <ShortcutsOverlay onClose={toggleHelp} />}

      {chatOpen && (
        <ChatPanel
          onClose={() => { setChatOpen(false); stopNarrate(); }}
          messages={chatMessages}
          input={chatInput}
          onInputChange={setChatInput}
          onSend={sendChatMessage}
          loading={chatLoading}
          error={chatError}
          scrollRef={chatScrollRef}
          chatMode={chatMode}
          onSetMode={setChatMode}
          onExplain={explainNow}
          onStartNarrate={startNarrate}
          onStopNarrate={stopNarrate}
          narrateActive={!!narrateTimer}
          onQuiz={() => sendChatMessage('Ask me a multiple choice physics quiz question based on what the simulation is doing right now.')}
          onJudge={() => sendChatMessage('You are a competition judge. Ask me one tough question about this simulation to test my understanding.')}
          onExportChat={exportChat}
        />
      )}

      {ui.warning && (
        <div className="absolute top-12 left-1/2 -translate-x-1/2 z-30 px-4 py-2 border border-amber-400/50 bg-amber-950/60 text-amber-300 text-[11px] tracking-wide">
          ⚠ {ui.warning}
        </div>
      )}

      {/* LEFT PANEL — SIMULATION / PHYSICS / CAMERA / VISUALS / PRESETS */}
      <div
        className={`absolute top-12 left-0 bottom-20 z-20 transition-transform duration-300 ${
          ui.panelLeft ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="w-64 h-full overflow-y-auto bg-black/50 backdrop-blur-md border-r border-white/10 p-3 space-y-4 text-[11px] text-slate-300">
          <Section title="SIMULATION">
            <div className="flex gap-2">
              <SmallBtn onClick={togglePlay} active={ui.running}>
                {ui.running ? 'PAUSE' : 'PLAY'}
              </SmallBtn>
              <SmallBtn onClick={resetSim}>RESET</SmallBtn>
              <SmallBtn onClick={stepOnce}>STEP</SmallBtn>
            </div>
            <Row label="SPEED">
              <select
                className="bg-black/60 border border-white/15 text-cyan-200 px-1 py-0.5 text-[11px] w-24"
                value={ui.speed}
                onChange={(e) => setSpeed(parseFloat(e.target.value))}
              >
                {[0.1, 0.25, 0.5, 1, 2, 10, 100].map((v) => (
                  <option key={v} value={v}>{v}×</option>
                ))}
              </select>
            </Row>
          </Section>

          <Section title="PHYSICS">
            <Row label="INTEGRATOR">
              <select
                className="bg-black/60 border border-white/15 text-cyan-200 px-1 py-0.5 text-[11px] w-24"
                value={ui.integrator}
                onChange={(e) => setIntegrator(e.target.value)}
              >
                <option value="rk4">RK4</option>
                <option value="verlet">VERLET</option>
                <option value="euler">EULER</option>
              </select>
            </Row>
            <Row label="G">
              <span className="text-cyan-200">{simRef.current.G.toFixed(2)}</span>
            </Row>
            <ToggleRow label="ADAPTIVE DT" value={ui.adaptiveOn} onChange={() => toggleFlag('adaptiveOn')} />
            {ui.adaptiveOn && (
              <div className="pl-1 space-y-1 border-l border-white/10 ml-1">
                <Row label="MIN DT">
                  <MiniInput value={ui.dtMin} onChange={(v) => setAdaptiveField('dtMin', parseFloat(v) || 0.0001)} />
                </Row>
                <Row label="MAX DT">
                  <MiniInput value={ui.dtMax} onChange={(v) => setAdaptiveField('dtMax', parseFloat(v) || 0.01)} />
                </Row>
                <Row label="TOLERANCE">
                  <MiniInput value={ui.tolerance} onChange={(v) => setAdaptiveField('tolerance', parseFloat(v) || 1e-6)} />
                </Row>
              </div>
            )}
          </Section>

          <Section title="CAMERA">
            <Row label="MODE">
              <select
                className="bg-black/60 border border-white/15 text-cyan-200 px-1 py-0.5 text-[11px] w-32"
                value={ui.camMode}
                onChange={(e) => setCamMode(e.target.value)}
              >
                {CAMERA_MODES.map((m) => (
                  <option key={m.key} value={m.key}>{m.label}</option>
                ))}
              </select>
            </Row>
            <SmallBtn onClick={resetCamera}>RESET CAMERA</SmallBtn>
          </Section>

          <Section title="VISUALS">
            <ToggleRow label="TRAILS (T)" value={ui.trailsOn} onChange={() => toggleFlag('trailsOn')} />
            <ToggleRow label="VELOCITY VECTORS (V)" value={ui.showVectors} onChange={() => toggleFlag('showVectors')} />
            <ToggleRow label="CENTER OF MASS" value={ui.showCOM} onChange={() => toggleFlag('showCOM')} />
            <ToggleRow label="COORDINATE GRID" value={ui.showGrid} onChange={() => toggleFlag('showGrid')} />
            <ToggleRow label="AXES" value={ui.showAxes} onChange={() => toggleFlag('showAxes')} />
            <ToggleRow label="LABELS" value={ui.showLabels} onChange={() => toggleFlag('showLabels')} />
            <ToggleRow label="SPACETIME GRID" value={ui.showSpacetime} onChange={() => toggleFlag('showSpacetime')} />
            {ui.showSpacetime && (
              <div className="text-[9px] text-slate-500 leading-snug pt-0.5">
                White grid warps downward using the real gravitational potential at each point — heavier/closer bodies dip it deeper.
              </div>
            )}
          </Section>

          <Section title="GRAVITATIONAL FIELD">
            <Row label="MODE">
              <select
                className="bg-black/60 border border-white/15 text-cyan-200 px-1 py-0.5 text-[10px] w-28"
                value={ui.fieldMode}
                onChange={(e) => setFieldMode(e.target.value)}
              >
                <option value="off">OFF</option>
                <option value="lines">FIELD LINES</option>
                <option value="vectors">VECTOR FIELD</option>
                <option value="particles">PARTICLE FLOW</option>
                <option value="potential">POTENTIAL CONTOURS</option>
              </select>
            </Row>
            {ui.fieldMode !== 'off' && (
              <div className="text-[9px] text-slate-500 leading-snug pt-0.5">
                Sampled on a 12×12 grid, z=0 plane — recomputed from live body positions.
              </div>
            )}
          </Section>

          <Section title="PRESETS">
            <div className="flex flex-col gap-1">
              <PresetBtn active={ui.presetKey === 'figureEight'} onClick={() => loadPreset('figureEight')}>
                FIGURE-8 ORBIT
              </PresetBtn>
              <PresetBtn active={ui.presetKey === 'hierarchical'} onClick={() => loadPreset('hierarchical')}>
                HIERARCHICAL TRIPLE
              </PresetBtn>
              <PresetBtn active={ui.presetKey === 'chaos'} onClick={() => loadPreset('chaos')}>
                EQUAL-MASS CHAOS
              </PresetBtn>
              <PresetBtn active={ui.presetKey === 'restricted'} onClick={() => loadPreset('restricted')}>
                RESTRICTED THREE-BODY
              </PresetBtn>
            </div>
          </Section>

          <Section title="CHAOS LAB">
            <Row label="EPSILON">
              <MiniInput value={ui.epsilon} onChange={(v) => setChaosField('epsilon', parseFloat(v) || 1e-6)} />
            </Row>
            <Row label="PERTURB">
              <select
                className="bg-black/60 border border-white/15 text-cyan-200 px-1 py-0.5 text-[10px] w-24"
                value={ui.perturbTarget}
                onChange={(e) => setChaosField('perturbTarget', e.target.value)}
              >
                <option value="all">ALL BODIES</option>
                <option value="0">BODY 01</option>
                <option value="1">BODY 02</option>
                <option value="2">BODY 03</option>
              </select>
            </Row>
            <Row label="TYPE">
              <select
                className="bg-black/60 border border-white/15 text-cyan-200 px-1 py-0.5 text-[10px] w-24"
                value={ui.perturbType}
                onChange={(e) => setChaosField('perturbType', e.target.value)}
              >
                <option value="position">POSITION</option>
                <option value="velocity">VELOCITY</option>
                <option value="both">BOTH</option>
              </select>
            </Row>
            <div className="flex gap-2 pt-1">
              {!ui.chaosOn ? (
                <SmallBtn onClick={enableChaosLab}>ENABLE</SmallBtn>
              ) : (
                <>
                  <SmallBtn onClick={enableChaosLab}>REINITIALIZE</SmallBtn>
                  <SmallBtn onClick={disableChaosLab} active>DISABLE</SmallBtn>
                </>
              )}
            </div>
            {ui.chaosOn && (
              <div className="pt-1.5 mt-1 space-y-1 border-t border-white/10">
                <Telemetry label="INITIAL SEPARATION" value={ui.chaosInitialSep.toExponential(3)} />
                <Telemetry label="CURRENT SEPARATION" value={ui.chaosSep.toExponential(3)} color="text-amber-300" />
                <Telemetry label="MAX SEPARATION" value={ui.chaosMaxSep.toExponential(3)} />
                <Telemetry label="λ (APPROX.)" value={ui.chaosLyap == null ? '—' : ui.chaosLyap.toExponential(3)} color="text-violet-300" />
                <div className="text-[9px] text-slate-500 leading-snug pt-0.5">
                  Approximate / numerical estimate — not a rigorous Lyapunov calculation. White wireframe spheres are the perturbed twin system.
                </div>
              </div>
            )}
          </Section>

          <Section title="BODY MASS">
            {[0, 1, 2].map((i) => (
              <div key={i} className="mb-2">
                <div className="flex items-center justify-between mb-1">
                  <span style={{ color: BODY_HEX[i] }}>{BODY_NAMES[i]}</span>
                </div>
                <Row label="MASS">
                  <input
                    type="range"
                    min="0.1"
                    max="3"
                    step="0.05"
                    value={ui.masses[i]}
                    onChange={(e) => setMass(i, parseFloat(e.target.value))}
                    className="w-24 accent-cyan-400"
                  />
                  <span className="ml-2 text-cyan-200 w-10 text-right">
                    {ui.masses[i] < 0.01 ? ui.masses[i].toExponential(1) : ui.masses[i].toFixed(2)}
                  </span>
                </Row>
              </div>
            ))}
          </Section>
        </div>
      </div>

      {/* RIGHT PANEL — TELEMETRY / BODY DATA / EDIT */}
      <div
        className={`absolute top-12 right-0 bottom-20 z-20 transition-transform duration-300 ${
          ui.panelRight ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="w-64 h-full overflow-y-auto bg-black/50 backdrop-blur-md border-l border-white/10 p-3 space-y-4 text-[11px] text-slate-300">
          <Section title="SYSTEM TELEMETRY">
            <Telemetry label="TOTAL ENERGY" value={fmt(ui.energy.total)} />
            <Telemetry label="KINETIC ENERGY" value={fmt(ui.energy.KE)} color="text-cyan-300" />
            <Telemetry label="POTENTIAL ENERGY" value={fmt(ui.energy.PE)} color="text-violet-300" />
            <Telemetry label="ENERGY ERROR" value={ui.energyError.toExponential(2)} color="text-amber-300" />
            <Telemetry label="LINEAR MOMENTUM" value={fmt(ui.momentumMag)} />
            <Telemetry label="ANGULAR MOMENTUM" value={fmt(ui.angMomentumMag)} />
            <Telemetry label="MIN SEPARATION" value={fmt(ui.minDist, 3)} />
            <Telemetry label="MAX SEPARATION" value={fmt(ui.maxDist, 3)} />
          </Section>

          <Section title="CENTER OF MASS">
            <Row label="X"><span className="text-slate-200">{fmt(ui.com[0], 4)}</span></Row>
            <Row label="Y"><span className="text-slate-200">{fmt(ui.com[1], 4)}</span></Row>
            <Row label="Z"><span className="text-slate-200">{fmt(ui.com[2], 4)}</span></Row>
          </Section>

          <Section title="PAIRWISE DISTANCES">
            <Telemetry label={`${BODY_NAMES[0]} ↔ ${BODY_NAMES[1]}`} value={fmt(ui.pairDist.d01, 3)} color="text-cyan-300" />
            <Telemetry label={`${BODY_NAMES[0]} ↔ ${BODY_NAMES[2]}`} value={fmt(ui.pairDist.d02, 3)} color="text-violet-300" />
            <Telemetry label={`${BODY_NAMES[1]} ↔ ${BODY_NAMES[2]}`} value={fmt(ui.pairDist.d12, 3)} color="text-amber-300" />
          </Section>

          <Section title="BODY DATA">
            <div className="flex gap-1 mb-2">
              {[0, 1, 2].map((i) => (
                <button
                  key={i}
                  onClick={() => selectBody(i)}
                  className={`flex-1 px-1 py-1 border text-[9px] tracking-wide ${
                    ui.selected === i ? 'border-white/50 bg-white/10' : 'border-white/10 text-slate-500'
                  }`}
                  style={ui.selected === i ? { color: BODY_HEX[i] } : {}}
                >
                  {BODY_NAMES[i]}
                </button>
              ))}
            </div>
            <Telemetry label="MASS" value={`${ui.masses[ui.selected].toFixed(3)} M`} />
            <Telemetry label="POS X" value={fmt(ui.bodyData.pos[0], 3)} />
            <Telemetry label="POS Y" value={fmt(ui.bodyData.pos[1], 3)} />
            <Telemetry label="POS Z" value={fmt(ui.bodyData.pos[2], 3)} />
            <Telemetry label="VEL X" value={fmt(ui.bodyData.vel[0], 3)} />
            <Telemetry label="VEL Y" value={fmt(ui.bodyData.vel[1], 3)} />
            <Telemetry label="VEL Z" value={fmt(ui.bodyData.vel[2], 3)} />
            <Telemetry label="SPEED" value={fmt(ui.bodyData.speed, 3)} color="text-cyan-300" />
            <Telemetry label="DIST TO NEXT" value={fmt(ui.bodyData.distNext, 3)} />
          </Section>

          <Section title="DIRECT EDIT">
            <div className="flex gap-1 mb-1">
              <button
                onClick={() => setEditMode('live')}
                className={`flex-1 px-1 py-1 border text-[9px] tracking-wide ${
                  ui.editMode === 'live' ? 'border-cyan-400/60 text-cyan-200 bg-cyan-400/10' : 'border-white/10 text-slate-500'
                }`}
              >
                CURRENT STATE
              </button>
              <button
                onClick={() => setEditMode('initial')}
                className={`flex-1 px-1 py-1 border text-[9px] tracking-wide ${
                  ui.editMode === 'initial' ? 'border-violet-400/60 text-violet-200 bg-violet-400/10' : 'border-white/10 text-slate-500'
                }`}
              >
                INITIAL COND.
              </button>
            </div>
            <div className="grid grid-cols-3 gap-1 mb-1">
              <MiniInput value={editVals.px} onChange={(v) => setEditVals((p) => ({ ...p, px: v }))} width="w-full" />
              <MiniInput value={editVals.py} onChange={(v) => setEditVals((p) => ({ ...p, py: v }))} width="w-full" />
              <MiniInput value={editVals.pz} onChange={(v) => setEditVals((p) => ({ ...p, pz: v }))} width="w-full" />
            </div>
            <div className="grid grid-cols-3 gap-1 mb-2">
              <MiniInput value={editVals.vx} onChange={(v) => setEditVals((p) => ({ ...p, vx: v }))} width="w-full" />
              <MiniInput value={editVals.vy} onChange={(v) => setEditVals((p) => ({ ...p, vy: v }))} width="w-full" />
              <MiniInput value={editVals.vz} onChange={(v) => setEditVals((p) => ({ ...p, vz: v }))} width="w-full" />
            </div>
            <div className="flex gap-2">
              <SmallBtn onClick={applyEditVals}>APPLY</SmallBtn>
              <SmallBtn onClick={() => loadEditVals(ui.selected, ui.editMode)}>REVERT</SmallBtn>
            </div>
            <div className="text-[9px] text-slate-500 mt-1">
              Editing {ui.editMode === 'initial' ? 'initial conditions (applies on Reset)' : 'the live running state (applies now)'} for {BODY_NAMES[ui.selected]}.
            </div>
          </Section>
        </div>
      </div>

      {/* Panel toggle tabs */}
      <button
        onClick={() => togglePanel('panelLeft')}
        aria-label={ui.panelLeft ? 'Collapse control panel' : 'Expand control panel'}
        className="absolute top-1/2 left-0 z-30 -translate-y-1/2 bg-black/50 border border-white/10 text-slate-400 text-[10px] px-1 py-3 hover:text-cyan-300"
      >
        {ui.panelLeft ? '‹' : '›'}
      </button>
      <button
        onClick={() => togglePanel('panelRight')}
        aria-label={ui.panelRight ? 'Collapse telemetry panel' : 'Expand telemetry panel'}
        className="absolute top-1/2 right-0 z-30 -translate-y-1/2 bg-black/50 border border-white/10 text-slate-400 text-[10px] px-1 py-3 hover:text-cyan-300"
      >
        {ui.panelRight ? '›' : '‹'}
      </button>

      {/* ANALYSIS DRAWER */}
      <AnalysisDrawer
        open={ui.analysisOpen}
        tab={ui.analysisTab}
        onTab={setAnalysisTab}
        history={historyRef.current}
        onExportCSV={exportCSV}
        onExportJSON={exportJSON}
        _tick={chartTick}
      />

      {/* BOTTOM TRANSPORT BAR — z-30 so it always sits above the analysis drawer */}
      <div className="absolute bottom-0 left-0 right-0 z-30 bg-[#060d1a] border-t-2 border-cyan-400/30 px-4 py-3 flex items-center gap-3 text-[11px] text-slate-200">
        <SmallBtn onClick={resetSim} label="Reset simulation">⟲</SmallBtn>
        <SmallBtn onClick={togglePlay} active={ui.running} label={ui.running ? 'Pause' : 'Play'}>
          {ui.running ? '❚❚' : '▶'}
        </SmallBtn>
        <SmallBtn onClick={stepOnce} label="Step one frame forward">⏭</SmallBtn>
        <SmallBtn onClick={toggleAnalysis} active={ui.analysisOpen}>ANALYSIS</SmallBtn>
        <div className="flex-1 mx-2 h-[3px] bg-white/10 relative rounded-full overflow-hidden">
          <div
            className="absolute left-0 top-0 bottom-0 bg-cyan-400/70"
            style={{ width: `${Math.min(100, (ui.simTime % 20) * 5)}%` }}
          />
        </div>
        <span className="text-slate-300 hidden sm:inline tabular-nums">T = {fmt(ui.simTime, 2)}s</span>
        <span className="text-cyan-300 hidden sm:inline font-semibold">{ui.speed}×</span>
      </div>
    </div>
  );
}

/* ---------------- Analysis drawer + SVG charts (Phase 5) ---------------- */

const ANALYSIS_TABS = [
  { key: 'energy', label: 'ENERGY' },
  { key: 'momentum', label: 'MOMENTUM' },
  { key: 'angular', label: 'ANGULAR MOMENTUM' },
  { key: 'distances', label: 'DISTANCES' },
  { key: 'error', label: 'NUMERICAL ERROR' },
  { key: 'chaos', label: 'CHAOS LAB' },
];

function AnalysisDrawer({ open, tab, onTab, history, onExportCSV, onExportJSON }) {
  const H = history;
  let series = [];
  let note = '';
  let tArr = H.t;
  if (tab === 'energy') {
    series = [
      { name: 'KINETIC', color: BODY_HEX[0], values: H.KE },
      { name: 'POTENTIAL', color: BODY_HEX[1], values: H.PE },
      { name: 'TOTAL', color: '#ffffff', values: H.Etot },
    ];
    note = 'K = ½Σmᵢ|vᵢ|²   U = −GΣ mᵢmⱼ/rᵢⱼ   E = K + U';
  } else if (tab === 'momentum') {
    series = [{ name: '|P|', color: BODY_HEX[0], values: H.momMag }];
    note = 'P = Σ mᵢvᵢ — should stay flat near zero for an isolated system';
  } else if (tab === 'angular') {
    series = [{ name: '|L|', color: BODY_HEX[1], values: H.angMag }];
    note = 'L = Σ rᵢ × mᵢvᵢ — conserved for central gravitational forces';
  } else if (tab === 'distances') {
    series = [
      { name: `${BODY_NAMES[0]}↔${BODY_NAMES[1]}`, color: BODY_HEX[0], values: H.d01 },
      { name: `${BODY_NAMES[0]}↔${BODY_NAMES[2]}`, color: BODY_HEX[1], values: H.d02 },
      { name: `${BODY_NAMES[1]}↔${BODY_NAMES[2]}`, color: BODY_HEX[2], values: H.d12 },
    ];
    note = 'pairwise separations — sharp dips indicate close encounters';
  } else if (tab === 'error') {
    series = [{ name: 'ENERGY ERROR', color: '#f0b34d', values: H.err }];
    note = '|E(t) − E₀| / |E₀| — the numerical-stability signature of the active integrator';
  } else if (tab === 'chaos') {
    series = [{ name: 'SEPARATION |A−B|', color: '#f0b34d', values: H.sep }];
    note = 'divergence between twin systems A/B, elapsed time since Chaos Lab was enabled — roughly exponential growth ⇒ chaotic sensitivity';
    tArr = H.chaosT;
  }

  const n = series.length ? series[0].values.length : 0;
  const last = (arr) => (arr.length ? arr[arr.length - 1] : 0);

  return (
    <div
      className={`absolute left-0 right-0 bottom-20 z-[25] h-60 bg-[#060d1a]/95 backdrop-blur-md border-t-2 border-cyan-400/20 transition-transform duration-300 ${
        open ? 'translate-y-0' : 'translate-y-[115%]'
      }`}
    >
      <div className="flex items-center gap-1 px-3 pt-2 pb-1 overflow-x-auto text-[10px] font-mono">
        {ANALYSIS_TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => onTab(t.key)}
            className={`px-2 py-1 border whitespace-nowrap tracking-wide ${
              tab === t.key
                ? 'border-cyan-400/50 text-cyan-200 bg-cyan-400/10'
                : 'border-white/10 text-slate-500 hover:text-slate-300'
            }`}
          >
            {t.label}
          </button>
        ))}
        <span className="ml-auto text-slate-500 pr-1">{n} SAMPLES</span>
        <button onClick={onExportCSV} className="px-2 py-1 border border-white/10 text-slate-400 hover:text-cyan-300 hover:border-white/25 whitespace-nowrap">
          EXPORT CSV
        </button>
        <button onClick={onExportJSON} className="px-2 py-1 border border-white/10 text-slate-400 hover:text-cyan-300 hover:border-white/25 whitespace-nowrap">
          EXPORT JSON
        </button>
      </div>

      <div className="px-3 h-32">
        {n < 2 ? (
          <div className="h-full flex items-center justify-center text-slate-600 text-[11px] font-mono">
            {tab === 'chaos' ? 'Enable Chaos Lab and run the simulation to populate this graph.' : 'Run the simulation to populate this graph.'}
          </div>
        ) : (
          <MultiLineChart series={series} tArr={tArr} />
        )}
      </div>

      <div className="px-3 pt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] font-mono text-slate-400">
        {series.map((s) => (
          <span key={s.name} className="flex items-center gap-1.5">
            <span className="w-2 h-2 inline-block" style={{ background: s.color }} />
            {s.name}: <span className="text-slate-200">{last(s.values).toExponential(3)}</span>
          </span>
        ))}
        <span className="ml-auto text-slate-600 hidden sm:inline">{note}</span>
      </div>
    </div>
  );
}

function buildSvgPath(values, w, h, min, max) {
  const nv = values.length;
  if (nv < 2) return '';
  const range = max - min || 1;
  let d = '';
  for (let i = 0; i < nv; i++) {
    const x = (i / (nv - 1)) * w;
    const y = h - ((values[i] - min) / range) * h;
    d += `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)} `;
  }
  return d;
}

function MultiLineChart({ series, tArr }) {
  const width = 600;
  const height = 128;
  const allVals = series.flatMap((s) => s.values).filter((v) => Number.isFinite(v));
  let min = allVals.length ? Math.min(...allVals) : 0;
  let max = allVals.length ? Math.max(...allVals) : 1;
  if (min === max) { min -= 1; max += 1; }
  const pad = (max - min) * 0.1;
  min -= pad;
  max += pad;
  const tMin = tArr[0] ?? 0;
  const tMax = tArr[tArr.length - 1] ?? 1;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full" preserveAspectRatio="none">
      {[0, 0.25, 0.5, 0.75, 1].map((f) => (
        <line key={f} x1={0} x2={width} y1={f * height} y2={f * height} stroke="#ffffff" strokeOpacity="0.06" />
      ))}
      {min < 0 && max > 0 && (
        <line
          x1={0} x2={width}
          y1={height - ((0 - min) / (max - min)) * height}
          y2={height - ((0 - min) / (max - min)) * height}
          stroke="#ffffff" strokeOpacity="0.15" strokeDasharray="3 3"
        />
      )}
      {series.map((s) => (
        <path key={s.name} d={buildSvgPath(s.values, width, height, min, max)} fill="none" stroke={s.color} strokeWidth="1.6" />
      ))}
      <text x={4} y={12} fill="#64748b" fontSize="9" fontFamily="monospace">{max.toExponential(2)}</text>
      <text x={4} y={height - 4} fill="#64748b" fontSize="9" fontFamily="monospace">{min.toExponential(2)}</text>
      <text x={width - 4} y={height - 4} fill="#64748b" fontSize="9" fontFamily="monospace" textAnchor="end">
        T={tMax.toFixed(1)}
      </text>
      <text x={4} y={height - 4} dx="46" fill="#64748b" fontSize="9" fontFamily="monospace">T={tMin.toFixed(1)}</text>
    </svg>
  );
}

/* ---------------- small UI primitives ---------------- */

function Section({ title, children }) {
  return (
    <div>
      <div className="text-[10px] tracking-[0.2em] text-slate-500 mb-1.5 border-b border-white/10 pb-1">
        {title}
      </div>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function Row({ label, children }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-500">{label}</span>
      <div className="flex items-center">{children}</div>
    </div>
  );
}

function Telemetry({ label, value, color = 'text-slate-100' }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-500">{label}</span>
      <span className={`${color} tabular-nums`}>{value}</span>
    </div>
  );
}

function ToggleRow({ label, value, onChange }) {
  return (
    <Row label={label}>
      <button
        onClick={onChange}
        className={`px-2 py-0.5 border text-[10px] ${
          value ? 'border-cyan-400/60 text-cyan-200 bg-cyan-400/10' : 'border-white/15 text-slate-500'
        }`}
      >
        {value ? 'ON' : 'OFF'}
      </button>
    </Row>
  );
}

function MiniInput({ value, onChange, width = 'w-16' }) {
  return (
    <input
      type="text"
      inputMode="decimal"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`bg-black/60 border border-white/15 text-cyan-200 px-1 py-0.5 text-[10px] ${width} text-right`}
    />
  );
}

function SmallBtn({ children, onClick, active, label }) {
  return (
    <button
      onClick={onClick}
      aria-label={label || undefined}
      title={label || undefined}
      className={`px-3 py-1.5 border text-[11px] font-mono tracking-wide transition-colors ${
        active
          ? 'border-cyan-400/80 text-cyan-200 bg-cyan-400/15 font-semibold'
          : 'border-white/25 text-slate-200 hover:border-cyan-400/50 hover:text-cyan-200 hover:bg-white/5'
      }`}
    >
      {children}
    </button>
  );
}

function PresetBtn({ children, onClick, active }) {
  return (
    <button
      onClick={onClick}
      className={`text-left px-2 py-1.5 border text-[10px] tracking-wide transition-colors ${
        active
          ? 'border-cyan-400/50 text-cyan-200 bg-cyan-400/10'
          : 'border-white/10 text-slate-400 hover:border-white/25 hover:text-slate-200'
      }`}
    >
      {children}
    </button>
  );
}

const SHORTCUTS = [
  ['SPACE', 'Play / Pause'],
  ['R', 'Reset'],
  ['F', 'Focus selected body'],
  ['C', 'Cycle camera mode'],
  ['T', 'Toggle trails'],
  ['V', 'Toggle velocity vectors'],
  ['A', 'Toggle analysis panel'],
  ['?', 'Toggle this help overlay'],
  ['ESC', 'Close open panel'],
];

function ShortcutsOverlay({ onClose }) {
  return (
    <div className="absolute inset-0 z-40 bg-black/70 backdrop-blur-sm flex items-center justify-center p-6" onClick={onClose}>
      <div
        className="bg-black/90 border border-white/15 px-6 py-5 max-w-xs w-full font-mono"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] tracking-[0.2em] text-slate-200">KEYBOARD SHORTCUTS</span>
          <button onClick={onClose} aria-label="Close shortcuts" className="text-slate-500 hover:text-cyan-300 text-sm">✕</button>
        </div>
        <div className="space-y-1.5">
          {SHORTCUTS.map(([key, desc]) => (
            <div key={key} className="flex items-center justify-between text-[11px]">
              <span className="text-cyan-300 border border-white/15 px-1.5 py-0.5 min-w-[2.5rem] text-center">{key}</span>
              <span className="text-slate-400">{desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ChatPanel({
  onClose, messages, input, onInputChange, onSend, loading, error,
  scrollRef, chatMode, onSetMode, onExplain, onStartNarrate, onStopNarrate,
  onQuiz, onJudge, onExportChat, narrateActive,
}) {
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend(); }
  };

  const SUGGESTED = [
    'Why is energy drifting?',
    'Is this system chaotic?',
    'What will happen next?',
    'Explain conservation of momentum here',
    'Why do bodies speed up when close?',
  ];

  const MODES = [
    { key: 'normal',  label: '💬 Chat',    title: 'Normal Q&A' },
    { key: 'narrate', label: '🎙 Narrate', title: 'Auto-commentary every 8s' },
    { key: 'quiz',    label: '📝 Quiz',    title: 'Get a quiz question' },
    { key: 'judge',   label: '🎓 Judge',   title: 'Judge asks competition questions' },
  ];

  return (
    <div className="absolute bottom-20 right-3 z-[35] w-80 max-w-[calc(100vw-1.5rem)] bg-black/92 backdrop-blur-md border border-white/15 flex flex-col font-mono" style={{height:'26rem'}}>

      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/10 shrink-0">
        <span className="text-[10px] tracking-[0.2em] text-slate-200">AI ASSISTANT</span>
        <div className="flex items-center gap-2">
          <button onClick={onExportChat} title="Export chat as text" className="text-slate-500 hover:text-cyan-300 text-[10px]">⬇</button>
          <button onClick={onClose} aria-label="Close" className="text-slate-500 hover:text-cyan-300 text-sm">✕</button>
        </div>
      </div>

      {/* Mode selector */}
      <div className="flex gap-1 px-2 pt-1.5 pb-1 shrink-0 overflow-x-auto">
        {MODES.map((m) => (
          <button
            key={m.key}
            title={m.title}
            onClick={() => {
              onSetMode(m.key);
              if (m.key === 'narrate') onStartNarrate();
              else { onStopNarrate(); }
              if (m.key === 'quiz') onQuiz();
              if (m.key === 'judge') onJudge();
            }}
            className={`whitespace-nowrap text-[9px] px-2 py-1 border transition-colors ${
              chatMode === m.key
                ? 'border-cyan-400/60 text-cyan-200 bg-cyan-400/10'
                : 'border-white/10 text-slate-500 hover:text-slate-300'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Quick-action buttons */}
      <div className="flex gap-1 px-2 pb-1.5 shrink-0">
        <button
          onClick={onExplain}
          disabled={loading}
          className="text-[9px] px-2 py-1 border border-violet-400/40 text-violet-300 hover:bg-violet-400/10 disabled:opacity-40 whitespace-nowrap"
        >
          🔍 EXPLAIN NOW
        </button>
        <button
          onClick={() => onSend('What should I watch for in this simulation?')}
          disabled={loading}
          className="text-[9px] px-2 py-1 border border-white/10 text-slate-400 hover:text-slate-200 disabled:opacity-40 whitespace-nowrap"
        >
          💡 TIPS
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-1 space-y-2 min-h-0">
        {messages.length === 0 && (
          <div className="space-y-1.5 pt-1">
            <div className="text-[9px] text-slate-600">SUGGESTED QUESTIONS</div>
            {SUGGESTED.map((q) => (
              <button
                key={q}
                onClick={() => onSend(q)}
                disabled={loading}
                className="block w-full text-left text-[10px] text-slate-400 border border-white/8 px-2 py-1.5 hover:border-cyan-400/30 hover:text-cyan-200 transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`text-[11px] leading-snug ${m.role === 'user' ? 'text-right' : 'text-left'}`}>
            <span className={`inline-block px-2 py-1 max-w-[92%] whitespace-pre-wrap text-left ${
              m.role === 'user'
                ? 'bg-cyan-400/10 text-cyan-100 border border-cyan-400/20'
                : 'bg-white/5 text-slate-200 border border-white/10'
            }`}>
              {m.content}
            </span>
          </div>
        ))}
        {loading && (
          <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
            <span className="animate-pulse">●</span> thinking…
          </div>
        )}
        {error && (
          <div className="text-[10px] text-amber-300 border border-amber-400/30 bg-amber-950/40 px-2 py-1">{error}</div>
        )}
      </div>

      {/* Input */}
      <div className="flex items-center gap-1.5 px-2 py-2 border-t border-white/10 shrink-0">
        <input
          type="text"
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={chatMode === 'quiz' ? 'Type A, B, C or D…' : chatMode === 'judge' ? 'Answer the judge…' : 'Ask or type a command…'}
          className="flex-1 bg-black/60 border border-white/15 text-slate-200 px-2 py-1.5 text-[11px]"
        />
        <button
          onClick={() => onSend()}
          disabled={loading || !input.trim()}
          className="px-2.5 py-1.5 border border-cyan-400/40 text-cyan-200 text-[11px] disabled:opacity-40 hover:bg-cyan-400/10"
        >
          SEND
        </button>
      </div>
    </div>
  );
}
