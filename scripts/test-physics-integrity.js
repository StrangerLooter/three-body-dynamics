import assert from 'node:assert';
import {
  vAdd,
  vSub,
  vScale,
  vDot,
  vCross,
  vLen,
  computeAccelerations,
  computePotentialAt,
  computePotentialAtCoords,
  computeEnergy,
  computeAngularMomentum,
  integrateStep,
  computeLagrangePoints,
  PRESETS,
} from '../src/physics/index.js';

console.log('🧪 Starting Physics & Mathematical Integrity Test Suite...\n');

let passedTests = 0;
function test(name, fn) {
  try {
    fn();
    console.log(`  ✅ PASS: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${name}`);
    console.error(err);
    process.exit(1);
  }
}

// ─────────────────────────────────────────────────────────────
// 1. Vector Math Integrity
// ─────────────────────────────────────────────────────────────
test('Vector Addition, Subtraction, and Scaling', () => {
  const a = [1, 2, 3];
  const b = [4, 5, 6];
  assert.deepStrictEqual(vAdd(a, b), [5, 7, 9]);
  assert.deepStrictEqual(vSub(b, a), [3, 3, 3]);
  assert.deepStrictEqual(vScale(a, 2), [2, 4, 6]);
  assert.strictEqual(vDot(a, b), 4 + 10 + 18);
  assert.strictEqual(vLen([3, 4, 0]), 5);
});

test('Vector Cross Product Right-Hand Rule', () => {
  const x = [1, 0, 0];
  const y = [0, 1, 0];
  const z = vCross(x, y);
  assert.deepStrictEqual(z, [0, 0, 1]);
});

// ─────────────────────────────────────────────────────────────
// 2. Gravitational Potential Math
// ─────────────────────────────────────────────────────────────
test('computePotentialAtCoords matches computePotentialAt (Zero-Allocation Equivalence)', () => {
  const positions = [
    [0, 0, 0],
    [1, 0, 0],
    [0, 1, 0],
  ];
  const masses = [1, 1, 1];
  const G = 1;
  const point = [0.5, 0.5, 0.5];

  const uOld = computePotentialAt(point, positions, masses, G);
  const uNew = computePotentialAtCoords(point[0], point[1], point[2], positions, masses, G);

  assert(Math.abs(uOld - uNew) < 1e-12, `Potentials differ: ${uOld} vs ${uNew}`);
  assert(Number.isFinite(uNew) && uNew < 0, 'Potential must be negative and finite');
});

// ─────────────────────────────────────────────────────────────
// 3. Conservation of Energy in RK4
// ─────────────────────────────────────────────────────────────
test('Figure-8 Orbit Energy Conservation over 100 RK4 Steps', () => {
  const f8 = PRESETS.figureEight();
  let state = JSON.parse(JSON.stringify(f8.state));
  const masses = [...f8.masses];
  const G = f8.G || 1;
  const dt = 0.005;

  const initialE = computeEnergy(state, masses, G).total;

  for (let step = 0; step < 100; step++) {
    state = integrateStep(state, masses, G, dt, 'rk4');
  }

  const finalE = computeEnergy(state, masses, G).total;
  const dE = Math.abs(finalE - initialE);
  const relError = dE / Math.abs(initialE);

  // RK4 4th order accuracy check
  assert(relError < 1e-4, `RK4 energy drift too high: relative error = ${relError}`);
});

// ─────────────────────────────────────────────────────────────
// 4. Conservation of Linear and Angular Momentum
// ─────────────────────────────────────────────────────────────
test('Angular Momentum Conservation in Velocity Verlet', () => {
  const f8 = PRESETS.figureEight();
  let state = JSON.parse(JSON.stringify(f8.state));
  const masses = [...f8.masses];
  const G = f8.G || 1;
  const dt = 0.005;

  const L0 = computeAngularMomentum(state, masses);

  for (let step = 0; step < 100; step++) {
    state = integrateStep(state, masses, G, dt, 'verlet');
  }

  const L1 = computeAngularMomentum(state, masses);
  assert(Math.abs(L1[0] - L0[0]) < 1e-6);
  assert(Math.abs(L1[1] - L0[1]) < 1e-6);
  assert(Math.abs(L1[2] - L0[2]) < 1e-6);
});

// ─────────────────────────────────────────────────────────────
// 5. Lagrange Points Calculation
// ─────────────────────────────────────────────────────────────
test('Lagrange Points Solver (L1 to L5 exist and are non-null)', () => {
  const positions = [
    [-1, 0, 0],
    [1, 0, 0],
    [0, 2, 0],
  ];
  const masses = [10, 1, 0.001];
  const G = 1;

  const lPoints = computeLagrangePoints(positions, masses, G);
  assert(Array.isArray(lPoints), 'Lagrange points should return an array');
  assert(lPoints.length === 5, 'Should compute 5 Lagrange points (L1-L5)');
  for (let i = 0; i < 5; i++) {
    assert(lPoints[i] && Array.isArray(lPoints[i].pos), `Lagrange point ${i + 1} position must be valid array`);
    assert(lPoints[i].pos.every(Number.isFinite), `Lagrange point ${i + 1} must have finite coordinates`);
  }
});

// ─────────────────────────────────────────────────────────────
// 6. Presets Completeness Check
// ─────────────────────────────────────────────────────────────
test('All Orbital Presets Have Valid Initial Conditions', () => {
  const presetKeys = Object.keys(PRESETS);
  assert(presetKeys.length >= 4, 'Must have at least 4 presets');

  for (const key of presetKeys) {
    const p = typeof PRESETS[key] === 'function' ? PRESETS[key]() : PRESETS[key];
    assert(p.name, `Preset ${key} must have a name`);
    assert(p.masses && p.masses.length === 3, `Preset ${key} must have 3 masses`);
    assert(p.state && p.state.pos.length === 3, `Preset ${key} must have 3 positions`);
    assert(p.state && p.state.vel.length === 3, `Preset ${key} must have 3 velocities`);
    assert(p.masses.every((m) => typeof m === 'number' && m > 0), `Preset ${key} masses must be positive numbers`);
  }
});

console.log(`\n🎉 All ${passedTests} Physics & Math Integrity Tests Passed Successfully!\n`);
