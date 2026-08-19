import { vAdd, vSub, vScale, vDot, vLen, vCross, SOFTENING } from './vectorMath.js';

/**
 * Total energy calculation (Kinetic + Gravitational Potential)
 */
export function computeEnergy(state, masses, G = 1) {
  let KE = 0;
  for (let i = 0; i < masses.length; i++) {
    KE += 0.5 * masses[i] * vDot(state.vel[i], state.vel[i]);
  }
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

/**
 * Total Linear Momentum: P = sum m_i * v_i
 */
export function computeMomentum(state, masses) {
  let p = [0, 0, 0];
  for (let i = 0; i < masses.length; i++) {
    p = vAdd(p, vScale(state.vel[i], masses[i]));
  }
  return p;
}

/**
 * Total Angular Momentum: L = sum (r_i x m_i * v_i)
 */
export function computeAngularMomentum(state, masses) {
  let L = [0, 0, 0];
  for (let i = 0; i < masses.length; i++) {
    L = vAdd(L, vScale(vCross(state.pos[i], state.vel[i]), masses[i]));
  }
  return L;
}

/**
 * Center of Mass: COM = (sum m_i * r_i) / M_total
 */
export function computeCOM(state, masses) {
  let com = [0, 0, 0];
  let M = 0;
  for (let i = 0; i < masses.length; i++) {
    com = vAdd(com, vScale(state.pos[i], masses[i]));
    M += masses[i];
  }
  return M > 0 ? vScale(com, 1 / M) : [0, 0, 0];
}

/**
 * Minimum distance among all body pairs
 */
export function minPairDistance(state) {
  let min = Infinity;
  for (let i = 0; i < state.pos.length; i++) {
    for (let j = i + 1; j < state.pos.length; j++) {
      const d = vLen(vSub(state.pos[j], state.pos[i]));
      if (d < min) min = d;
    }
  }
  return min;
}

/**
 * Comprehensive pairwise distance telemetry
 */
export function computePairDistances(state) {
  const d01 = vLen(vSub(state.pos[1], state.pos[0]));
  const d02 = vLen(vSub(state.pos[2], state.pos[0]));
  const d12 = vLen(vSub(state.pos[2], state.pos[1]));
  return {
    min: Math.min(d01, d02, d12),
    max: Math.max(d01, d02, d12),
    pairs: { d01, d02, d12 },
  };
}
