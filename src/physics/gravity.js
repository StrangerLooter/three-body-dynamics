import { vAdd, vSub, vScale, vDot, SOFTENING } from './vectorMath.js';

/**
 * Newtonian mutual gravitation:
 * a_i = G * sum_{j!=i} m_j * (r_j - r_i) / (|r_j - r_i|^2 + eps^2)^(3/2)
 */
export function computeAccelerations(positions, masses, G = 1) {
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

/**
 * State derivative for numerical integrators: { pos: vel, vel: acc }
 */
export function derivative(state, masses, G = 1) {
  const acc = computeAccelerations(state.pos, masses, G);
  return { pos: state.vel.map((v) => [...v]), vel: acc };
}

/**
 * Gravitational field vector sampled at an arbitrary point in space.
 */
export function computeFieldAt(point, positions, masses, G = 1) {
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

/**
 * Gravitational potential U sampled at an arbitrary point in space.
 * U = -G * sum_j (m_j / sqrt(|r_j - r|^2 + eps^2))
 */
export function computePotentialAt(point, positions, masses, G = 1) {
  let u = 0;
  for (let j = 0; j < positions.length; j++) {
    const d = vSub(positions[j], point);
    const dist = Math.sqrt(vDot(d, d) + SOFTENING);
    u -= (G * masses[j]) / dist;
  }
  return u;
}
